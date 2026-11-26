import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  GeneratedArtifact,
  PromptRun,
  PromptRunStatus,
  WorkspaceStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import {
  activeKnowledgeSourceRows,
  createKnowledgeSourceContentService,
} from '../../../test/legacy-input-reference.helper';
import {
  AiProvider,
  AiProviderOptions,
  AiProviderResult,
} from '../../ai/ai-provider.interface';
import {
  FAKE_ANALYSIS_X2_JSON,
  FAKE_FIT_ASSESSMENT_JSON,
  FakeAiProvider,
} from '../../ai/providers/fake.provider';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PromptRunsService,
  STALE_PROMPT_RUN_MS,
} from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { StepFailureService } from '../../workspaces/step-failure.service';
import { WorkspaceStatusService } from '../../workspaces/workspace-status.service';
import {
  ARTIFACT_TYPES,
  ExperimentalAnalysisService,
} from './experimental-analysis.service';
import { stagesOf } from './analysis-stages';
import { ExperimentalInputBuilderService } from './experimental-input-builder.service';

// The stage runner over in-memory stand-ins of its collaborators: the real StepFailureService,
// the real input builder over the real active knowledge sources, and the real fake provider
// (wrapped to count calls and to inject failures). Templates are test templates (T3 writes the
// real ones).

const VACANCY_TEXT = 'Generic vacancy text for the stage runner spec.';
const FAKE_MODEL = 'fake-model-v1';

const sha256 = (text: string) =>
  createHash('sha256').update(text, 'utf-8').digest('hex');

interface WorkspaceRow {
  id: string;
  status: WorkspaceStatus;
  analysisStrategy: AnalysisStrategy;
  contextLayout: ContextLayout;
  contextSourceSet: ContextSourceSet;
  storageRoot: string;
  workspacePath: string;
  company: { nameOriginal: string; companySlug: string };
  jobVacancy: { roleTitleOriginal: string; roleSlug: string };
  currentDecision: string | null;
  originalDecision: string | null;
  score: number | null;
  nextRecommendedAction: string | null;
  lastStepErrorStep: string | null;
  lastStepErrorMessage: string | null;
}

type ProviderOverride = () => Promise<AiProviderResult>;

const answer =
  (json: unknown): ProviderOverride =>
  () =>
    Promise.resolve({ text: JSON.stringify(json) });

const createHarness = () => {
  const log: string[] = [];
  // Starts now, so the 15-minute stale cutoff of in-flight runs applies to the harness runs.
  let clock = Date.now();
  const tick = () => new Date((clock += 1000));

  const workspaces = new Map<string, WorkspaceRow>();
  const notes: { id: string; workspaceId: string; text: string }[] = [];
  const noteApplications: { manualNoteId: string; promptRunId: string }[] = [];
  const runs: PromptRun[] = [];
  const aiRuns: { id: string; status: string; model: string }[] = [];
  const artifacts: GeneratedArtifact[] = [];
  const files = new Map<string, string>();

  const workspaceDir = (row: WorkspaceRow) =>
    path.resolve(row.storageRoot, row.workspacePath);

  const addWorkspace = (
    id: string,
    strategy: AnalysisStrategy,
    overrides: Partial<WorkspaceRow> = {},
  ): WorkspaceRow => {
    const row: WorkspaceRow = {
      id,
      status: WorkspaceStatus.source_saved,
      analysisStrategy: strategy,
      contextLayout: ContextLayout.single,
      contextSourceSet: ContextSourceSet.full,
      storageRoot: '/storage',
      workspacePath: `workspace_${id}`,
      company: { nameOriginal: 'Example Company', companySlug: 'Example' },
      jobVacancy: { roleTitleOriginal: 'Backend Role', roleSlug: 'Backend' },
      currentDecision: null,
      originalDecision: null,
      score: null,
      nextRecommendedAction: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      ...overrides,
    };
    workspaces.set(id, row);
    files.set(
      path.join(workspaceDir(row), '00_vacancy_source.txt'),
      VACANCY_TEXT,
    );
    return row;
  };

  const prisma = {
    applicationWorkspace: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(workspaces.get(where.id) ?? null),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<WorkspaceRow>;
        }) => {
          Object.assign(workspaces.get(where.id) as WorkspaceRow, data);
          return Promise.resolve({});
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string; lastStepErrorStep: string };
          data: Partial<WorkspaceRow>;
        }) => {
          const row = workspaces.get(where.id);
          if (row && row.lastStepErrorStep === where.lastStepErrorStep) {
            Object.assign(row, data);
          }
          return Promise.resolve({ count: 1 });
        },
      ),
    },
    promptRun: {
      findFirst: jest.fn(
        ({
          where,
        }: {
          where: {
            workspaceId: string;
            promptStep: { in: string[] };
            status: { in: PromptRunStatus[] };
            updatedAt: { gte: Date };
          };
        }) =>
          Promise.resolve(
            runs.find(
              (run) =>
                run.workspaceId === where.workspaceId &&
                where.promptStep.in.includes(run.promptStep) &&
                where.status.in.includes(run.status) &&
                run.updatedAt.getTime() >= where.updatedAt.gte.getTime(),
            ) ?? null,
          ),
      ),
    },
    manualNote: {
      findMany: jest.fn(({ where }: { where: { workspaceId: string } }) =>
        Promise.resolve(
          notes.filter((note) => note.workspaceId === where.workspaceId),
        ),
      ),
    },
    manualNoteApplication: {
      createMany: jest.fn(
        ({
          data,
        }: {
          data: { manualNoteId: string; promptRunId: string }[];
        }) => {
          noteApplications.push(...data);
          return Promise.resolve({ count: data.length });
        },
      ),
    },
  };

  const updateRun = (id: string, data: Partial<PromptRun>) => {
    Object.assign(runs.find((run) => run.id === id) as PromptRun, data);
  };
  const promptRuns = {
    create: jest.fn(
      (dto: {
        workspaceId: string;
        promptStep: string;
        templateId: string;
        templateVersion: number;
        inputHash: string;
        sourceSnapshot: string;
      }) => {
        // As PromptRunsService.create: a stale in-flight run of the step is failed first.
        for (const run of runs) {
          const isStale =
            run.workspaceId === dto.workspaceId &&
            run.promptStep === dto.promptStep &&
            run.updatedAt.getTime() < Date.now() - STALE_PROMPT_RUN_MS;
          if (isStale) run.status = PromptRunStatus.failed;
        }
        const isInFlight = runs.some(
          (run) =>
            run.workspaceId === dto.workspaceId &&
            run.promptStep === dto.promptStep &&
            (run.status === PromptRunStatus.pending ||
              run.status === PromptRunStatus.running),
        );
        if (isInFlight) {
          return Promise.reject(new ConflictException('already running'));
        }
        const run = {
          id: `run-${runs.length + 1}`,
          ...dto,
          status: PromptRunStatus.pending,
          feedbackNotes: null,
          aiRunId: null,
          outputArtifactIds: null,
          createdAt: tick(),
          updatedAt: tick(),
        } as PromptRun;
        runs.push(run);
        log.push(`run:${dto.promptStep}`);
        return Promise.resolve(run);
      },
    ),
    markRunning: jest.fn((id: string) => {
      updateRun(id, { status: PromptRunStatus.running });
      return Promise.resolve();
    }),
    complete: jest.fn((id: string, dto: { aiRunId: string }) => {
      updateRun(id, {
        status: PromptRunStatus.completed,
        aiRunId: dto.aiRunId,
      });
      return Promise.resolve();
    }),
    fail: jest.fn((id: string, aiRunId?: string) => {
      updateRun(id, {
        status: PromptRunStatus.failed,
        ...(aiRunId ? { aiRunId } : {}),
      });
      return Promise.resolve();
    }),
    failSafely: jest.fn((id: string, aiRunId?: string) => {
      const run = runs.find((item) => item.id === id) as PromptRun;
      if (
        run.status === PromptRunStatus.pending ||
        run.status === PromptRunStatus.running
      ) {
        updateRun(id, {
          status: PromptRunStatus.failed,
          ...(aiRunId ? { aiRunId } : {}),
        });
      }
      return Promise.resolve();
    }),
    findById: jest.fn((id: string) =>
      Promise.resolve(runs.find((run) => run.id === id) ?? null),
    ),
  };

  const saveAiRun = (status: string) =>
    jest.fn((dto: { model: string }) => {
      const aiRun = { id: `ai-${aiRuns.length + 1}`, status, model: dto.model };
      aiRuns.push(aiRun);
      log.push(`airun:${status}`);
      return Promise.resolve(aiRun);
    });
  const aiRunsService = {
    saveSuccess: saveAiRun('success'),
    saveFailed: saveAiRun('failed'),
  };

  const enoent = (filePath: string) =>
    Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' });
  const storage = {
    readFile: jest.fn((filePath: string) => {
      const content = files.get(path.resolve(filePath));
      return content === undefined
        ? Promise.reject(enoent(filePath))
        : Promise.resolve(content);
    }),
    readFileIfExists: jest.fn((filePath: string) =>
      Promise.resolve(files.get(path.resolve(filePath)) ?? null),
    ),
    writeFile: jest.fn((dir: string, name: string, content: string) => {
      const filePath = path.resolve(dir, name);
      files.set(filePath, content);
      log.push(`write:${name}`);
      return Promise.resolve({ filePath, hash: sha256(content) });
    }),
  };

  const artifactsService = {
    register: jest.fn(
      (dto: Omit<GeneratedArtifact, 'id' | 'isLatest' | 'version'>) => {
        for (const artifact of artifacts) {
          if (
            artifact.workspaceId === dto.workspaceId &&
            artifact.artifactType === dto.artifactType
          ) {
            artifact.isLatest = false;
          }
        }
        const artifact = {
          ...dto,
          id: `art-${artifacts.length + 1}`,
          isLatest: true,
          version: 1,
          createdAt: tick(),
        } as GeneratedArtifact;
        artifacts.push(artifact);
        log.push(`register:${dto.artifactType}`);
        return Promise.resolve(artifact);
      },
    ),
    findByWorkspaceId: jest.fn((workspaceId: string) =>
      Promise.resolve(
        artifacts.filter((artifact) => artifact.workspaceId === workspaceId),
      ),
    ),
  };

  const workspaceStatus = {
    transition: jest.fn(
      (
        id: string,
        from: WorkspaceStatus | WorkspaceStatus[],
        to: WorkspaceStatus,
        options: { data?: Partial<WorkspaceRow> } = {},
      ) => {
        const row = workspaces.get(id) as WorkspaceRow;
        const fromStatuses = Array.isArray(from) ? from : [from];
        if (!fromStatuses.includes(row.status)) {
          return Promise.reject(new ConflictException('status moved'));
        }
        Object.assign(row, options.data ?? {}, { status: to });
        log.push(`status:${to}`);
        return Promise.resolve(row);
      },
    ),
  };

  const templates = {
    findActive: jest.fn((step: string) =>
      Promise.resolve<{
        id: string;
        step: string;
        version: number;
        content: string;
      } | null>({
        id: `tpl-${step}`,
        step,
        version: 1,
        content: `Test template for ${step}.`,
      }),
    ),
  };

  const fake = new FakeAiProvider();
  const overrides = new Map<string, ProviderOverride>();
  const provider = {
    providerName: 'fake',
    modelName: FAKE_MODEL,
    complete: jest.fn(
      (prompt: string, inputContext: string, options?: AiProviderOptions) => {
        const step = options?.step ?? '';
        log.push(`provider:${step}`);
        const override = overrides.get(step);
        return override
          ? override()
          : fake.complete(prompt, inputContext, options);
      },
    ),
  };

  const stepFailure = new StepFailureService(
    prisma as unknown as PrismaService,
  );
  const service = new ExperimentalAnalysisService(
    prisma as unknown as PrismaService,
    { get: jest.fn() } as unknown as ConfigService,
    templates as unknown as PromptTemplatesService,
    {
      findActive: jest.fn(() => Promise.resolve(activeKnowledgeSourceRows())),
    } as unknown as KnowledgeSourcesService,
    new ExperimentalInputBuilderService(
      new KnowledgeSourceSelectionService(),
      createKnowledgeSourceContentService(),
    ),
    promptRuns as unknown as PromptRunsService,
    aiRunsService as unknown as AiRunsService,
    storage as unknown as ArtifactStorageService,
    artifactsService as unknown as ArtifactsService,
    workspaceStatus as unknown as WorkspaceStatusService,
    stepFailure,
    provider as AiProvider,
  );

  const providerSteps = () =>
    provider.complete.mock.calls.map(
      (call) => (call[2] as AiProviderOptions).step,
    );
  const artifactTypes = (workspaceId: string) =>
    artifacts
      .filter((artifact) => artifact.workspaceId === workspaceId)
      .map((artifact) => artifact.artifactType);
  const fileOf = (row: WorkspaceRow, name: string): string | undefined =>
    files.get(path.join(workspaceDir(row), name));

  // The stage plan the analysis selector gives a b / c workspace.
  const runAnalysis = (workspaceId: string) => {
    const strategy = workspaces.get(workspaceId)?.analysisStrategy;
    return service.runAnalysis(
      workspaceId,
      strategy === AnalysisStrategy.b ? stagesOf('b') : stagesOf('c'),
    );
  };

  return {
    service,
    runAnalysis,
    provider,
    overrides,
    log,
    runs,
    aiRuns,
    artifacts,
    files,
    notes,
    noteApplications,
    templates,
    promptRuns,
    artifactsService,
    addWorkspace,
    workspaceDir,
    providerSteps,
    artifactTypes,
    fileOf,
  };
};

type Harness = ReturnType<typeof createHarness>;

const EXPERIMENTAL_TYPES = [
  ARTIFACT_TYPES.requirements,
  ARTIFACT_TYPES.assessment,
  ARTIFACT_TYPES.decision,
  ARTIFACT_TYPES.legacyAnalysis,
];

const invalidX2: ProviderOverride = answer({
  fit_assessment: { ...FAKE_FIT_ASSESSMENT_JSON, category_scores: {} },
  advisory_decision: 'apply',
});

const parseFile = (harness: Harness, row: WorkspaceRow, name: string) =>
  JSON.parse(harness.fileOf(row, name) ?? 'null') as Record<string, unknown>;

describe('ExperimentalAnalysisService', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  describe('successful runs', () => {
    it('runs strategy b with one provider call', async () => {
      const row = harness.addWorkspace('ws-b', AnalysisStrategy.b);

      const result = await harness.runAnalysis('ws-b');

      expect(harness.providerSteps()).toEqual(['analysis_b']);
      expect([...harness.artifactTypes('ws-b')].sort()).toEqual(
        [...EXPERIMENTAL_TYPES].sort(),
      );
      const decision = parseFile(harness, row, '01c_analysis_decision.json');
      expect(row.status).toBe(WorkspaceStatus.paused_after_analysis);
      expect(row.currentDecision).toBe(decision.decision);
      expect(row.originalDecision).toBe(decision.decision);
      expect(row.score).toBe(decision.score);
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          workspaceStatus: WorkspaceStatus.paused_after_analysis,
          decision: decision.decision,
        }),
      );
      // The projected 01 is the legacy shape and carries the policy decision.
      const legacy = parseFile(harness, row, '01_vacancy_analysis.json');
      expect(legacy.decision).toBe(decision.decision);
      expect(legacy.step).toBe('prompt_1_vacancy_analysis');
      expect(harness.runs.map((run) => [run.promptStep, run.status])).toEqual([
        ['analysis_b', PromptRunStatus.completed],
      ]);
    });

    it('runs strategy c with two provider calls', async () => {
      const c = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      const b = harness.addWorkspace('ws-b', AnalysisStrategy.b);

      await harness.runAnalysis('ws-c');

      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);
      expect([...harness.artifactTypes('ws-c')].sort()).toEqual(
        [...EXPERIMENTAL_TYPES].sort(),
      );
      expect(c.status).toBe(WorkspaceStatus.paused_after_analysis);
      expect(harness.runs.map((run) => run.promptStep)).toEqual([
        'analysis_x1',
        'analysis_x2',
      ]);

      // B and C produce equal-shaped 01b / 01c (PRD "B and C runs").
      await harness.runAnalysis('ws-b');
      const keysOf = (row: WorkspaceRow, name: string) =>
        Object.keys(parseFile(harness, row, name)).sort();
      expect(keysOf(c, '01b_fit_assessment.json')).toEqual(
        keysOf(b, '01b_fit_assessment.json'),
      );
      expect(keysOf(c, '01c_analysis_decision.json')).toEqual(
        keysOf(b, '01c_analysis_decision.json'),
      );
    });

    it('saves each AiRun before writing files or registering artifacts', async () => {
      harness.addWorkspace('ws-c', AnalysisStrategy.c);

      await harness.runAnalysis('ws-c');

      expect(harness.log).toEqual([
        'run:analysis_x1',
        `status:${WorkspaceStatus.analysis_running}`,
        'provider:analysis_x1',
        'airun:success',
        'write:01a_vacancy_requirements.json',
        `register:${ARTIFACT_TYPES.requirements}`,
        'run:analysis_x2',
        'provider:analysis_x2',
        'airun:success',
        'write:01b_fit_assessment.json',
        `register:${ARTIFACT_TYPES.assessment}`,
        'write:01c_analysis_decision.json',
        `register:${ARTIFACT_TYPES.decision}`,
        'write:01_vacancy_analysis.json',
        `register:${ARTIFACT_TYPES.legacyAnalysis}`,
        `status:${WorkspaceStatus.paused_after_analysis}`,
      ]);
    });

    it('records the snapshot of the assessment stage', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      const activeRows = activeKnowledgeSourceRows();
      const prompt1Ids = new KnowledgeSourceSelectionService()
        .selectForStep('prompt_1', activeRows)
        .map((source) => [source.id, source.contentHash]);

      await harness.runAnalysis('ws-c');

      const [x1Run, x2Run] = harness.runs;
      const snapshot = JSON.parse(x2Run.sourceSnapshot as string) as {
        snapshotId: string;
        catalogHash: string;
        knowledgeSources: { id: string; contentHash: string }[];
      };
      expect(snapshot.snapshotId).toMatch(/^snap-[0-9a-f]{16}$/);
      expect(snapshot.catalogHash).toMatch(/^[0-9a-f]{64}$/);
      expect(
        snapshot.knowledgeSources.map((source) => [
          source.id,
          source.contentHash,
        ]),
      ).toEqual(prompt1Ids);
      const assessment = parseFile(harness, row, '01b_fit_assessment.json');
      expect(assessment.snapshot_id).toBe(snapshot.snapshotId);
      expect(
        parseFile(harness, row, '01c_analysis_decision.json').snapshot_id,
      ).toBe(snapshot.snapshotId);
      // X1 records its cv_rules source only.
      const x1Snapshot = JSON.parse(x1Run.sourceSnapshot as string) as {
        knowledgeSources: { sourceType: string }[];
      };
      expect(
        x1Snapshot.knowledgeSources.map((source) => source.sourceType),
      ).toEqual(['cv_rules']);
    });

    it('gives the manual notes to X2 only, with their ids', async () => {
      harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.notes.push({
        id: 'note-1',
        workspaceId: 'ws-c',
        text: 'A generic manual note.',
      });

      await harness.runAnalysis('ws-c');

      const [x1Call, x2Call] = harness.provider.complete.mock.calls;
      expect(x1Call[1]).not.toContain('A generic manual note.');
      expect(x2Call[1]).toContain('[manual_note:note-1]');
      expect(harness.noteApplications).toEqual([
        { manualNoteId: 'note-1', promptRunId: harness.runs[1].id },
      ]);
    });

    it('sends the boundary layout when the profile asks for it', async () => {
      harness.addWorkspace('ws-b', AnalysisStrategy.b, {
        contextLayout: ContextLayout.boundary,
      });

      await harness.runAnalysis('ws-b');

      const [[prompt, inputContext]] = harness.provider.complete.mock.calls;
      expect(prompt.startsWith('Test template for analysis_b.\n')).toBe(true);
      expect(prompt).toContain('=== KNOWLEDGE SOURCES ===');
      expect(inputContext).not.toContain('=== KNOWLEDGE SOURCES ===');
      expect(inputContext).toContain(VACANCY_TEXT);
    });
  });

  describe('stage failures', () => {
    it('rolls back to source_saved naming the failed stage', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.overrides.set('analysis_x2', invalidX2);

      const result = await harness.runAnalysis('ws-c');

      expect(row.status).toBe(WorkspaceStatus.source_saved);
      expect(row.lastStepErrorStep).toBe('prompt_1');
      expect(row.lastStepErrorMessage).toMatch(
        /^Vacancy analysis failed: analysis_x2: the answer failed validation: /,
      );
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          failedStage: 'analysis_x2',
          workspaceStatus: WorkspaceStatus.source_saved,
        }),
      );
      // X1 is registered, nothing of X2 and no analysis; X2's AiRun is a failed one.
      expect(harness.artifactTypes('ws-c')).toEqual([
        ARTIFACT_TYPES.requirements,
      ]);
      expect(harness.runs.map((run) => run.status)).toEqual([
        PromptRunStatus.completed,
        PromptRunStatus.failed,
      ]);
      expect(harness.aiRuns.map((aiRun) => aiRun.status)).toEqual([
        'success',
        'failed',
      ]);
      // No automatic retry of the paid call.
      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);
      expect(row.currentDecision).toBeNull();
    });

    it('rolls back on an X1 provider error without calling X2', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.overrides.set('analysis_x1', () =>
        Promise.reject(new Error('Upstream provider unavailable')),
      );

      const result = await harness.runAnalysis('ws-c');

      expect(harness.providerSteps()).toEqual(['analysis_x1']);
      expect(row.status).toBe(WorkspaceStatus.source_saved);
      expect(row.lastStepErrorStep).toBe('prompt_1');
      expect(row.lastStepErrorMessage).toBe(
        'Vacancy analysis failed: analysis_x1: Upstream provider unavailable',
      );
      expect(result.failedStage).toBe('analysis_x1');
      expect(harness.runs.map((run) => [run.promptStep, run.status])).toEqual([
        ['analysis_x1', PromptRunStatus.failed],
      ]);
      expect(harness.runs[0].aiRunId).toBe(harness.aiRuns[0].id);
      expect(harness.aiRuns.map((aiRun) => aiRun.status)).toEqual(['failed']);
      expect(harness.artifacts).toEqual([]);
    });

    it('keeps the readable provider reason after the stage name', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.overrides.set('analysis_x1', () =>
        Promise.reject(Object.assign(new Error('Too many'), { status: 429 })),
      );

      await harness.runAnalysis('ws-c');

      expect(row.lastStepErrorMessage).toBe(
        'Vacancy analysis failed: analysis_x1: the AI provider rate limit was reached, wait a minute. Retry the step.',
      );
    });

    it('rolls back a failed b stage', async () => {
      const row = harness.addWorkspace('ws-b', AnalysisStrategy.b);
      harness.overrides.set('analysis_b', answer(FAKE_ANALYSIS_X2_JSON));

      const result = await harness.runAnalysis('ws-b');

      expect(row.status).toBe(WorkspaceStatus.source_saved);
      expect(row.lastStepErrorStep).toBe('prompt_1');
      expect(row.lastStepErrorMessage).toContain(
        'analysis_b: the answer failed validation: vacancy_requirements must be an object',
      );
      expect(result.failedStage).toBe('analysis_b');
      expect(harness.artifacts).toEqual([]);
    });

    it('fails the stage when the policy rejects its answer', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      // Contract-valid, but one cause is counted in two categories: row V rejects it.
      harness.overrides.set(
        'analysis_x2',
        answer({
          fit_assessment: {
            ...FAKE_FIT_ASSESSMENT_JSON,
            risks: [
              {
                cause_id: 'cause-1',
                category: 'core_stack',
                level: 'medium',
                language: null,
                requirement_ids: [],
                reason: 'A generic gap.',
              },
              {
                cause_id: 'cause-1',
                category: 'seniority',
                level: 'medium',
                language: null,
                requirement_ids: [],
                reason: 'The same gap again.',
              },
            ],
          },
          advisory_decision: 'skip',
        }),
      );

      await harness.runAnalysis('ws-c');

      expect(row.status).toBe(WorkspaceStatus.source_saved);
      expect(row.lastStepErrorMessage).toMatch(
        /analysis_x2: the answer failed validation: Decision policy input rejected under row V/,
      );
      expect(harness.aiRuns.map((aiRun) => aiRun.status)).toEqual([
        'success',
        'failed',
      ]);
      for (const type of [
        ARTIFACT_TYPES.assessment,
        ARTIFACT_TYPES.decision,
        ARTIFACT_TYPES.legacyAnalysis,
      ]) {
        expect(harness.artifactTypes('ws-c')).not.toContain(type);
      }
    });

    it('fails the run that hit an unexpected error and names its stage', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.artifactsService.register.mockRejectedValueOnce(
        new Error('disk full'),
      );

      await expect(harness.runAnalysis('ws-c')).rejects.toThrow('disk full');

      expect(row.status).toBe(WorkspaceStatus.source_saved);
      expect(row.lastStepErrorMessage).toBe(
        'Vacancy analysis failed: analysis_x1: disk full',
      );
      expect(harness.runs[0].status).toBe(PromptRunStatus.failed);
      // The failed run stays linked to the AiRun that was saved.
      expect(harness.runs[0].aiRunId).toBe(harness.aiRuns[0].id);
      expect(harness.providerSteps()).toEqual(['analysis_x1']);
    });
  });

  describe('recovery reuse', () => {
    it('reuses a verified X1 after an X2 failure', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.overrides.set('analysis_x2', invalidX2);
      await harness.runAnalysis('ws-c');
      harness.overrides.clear();
      harness.provider.complete.mockClear();

      const result = await harness.runAnalysis('ws-c');

      expect(harness.providerSteps()).toEqual(['analysis_x2']);
      expect(result.stages).toEqual([
        expect.objectContaining({
          key: 'analysis_x1',
          reused: true,
          promptRunId: harness.runs[0].id,
        }),
        expect.objectContaining({ key: 'analysis_x2', reused: false }),
      ]);
      expect(row.status).toBe(WorkspaceStatus.paused_after_analysis);
      expect(row.lastStepErrorStep).toBeNull();
      // X2 read the very 01a the first X1 run wrote.
      const [[, x2Input]] = harness.provider.complete.mock.calls;
      expect(x2Input).toContain(
        harness.fileOf(row, '01a_vacancy_requirements.json'),
      );
    });

    it('does not reuse a stage whose file hash or identity differs', async () => {
      // File hash: the registered 01a was rewritten on disk after the failed attempt. The new
      // text is still a valid 01a, so only the hash check can refuse it.
      const tampered = harness.addWorkspace('ws-file', AnalysisStrategy.c);
      harness.overrides.set('analysis_x2', invalidX2);
      await harness.runAnalysis('ws-file');
      const requirementsPath = path.join(
        harness.workspaceDir(tampered),
        '01a_vacancy_requirements.json',
      );
      harness.files.set(
        requirementsPath,
        JSON.stringify(
          JSON.parse(harness.files.get(requirementsPath) as string),
        ),
      );
      harness.overrides.clear();
      harness.provider.complete.mockClear();

      await harness.runAnalysis('ws-file');

      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);

      // Identity: the X1 result was recorded under another model.
      harness.addWorkspace('ws-model', AnalysisStrategy.c);
      harness.provider.modelName = 'other-model';
      harness.overrides.set('analysis_x2', invalidX2);
      await harness.runAnalysis('ws-model');
      harness.provider.modelName = FAKE_MODEL;
      harness.overrides.clear();
      harness.provider.complete.mockClear();

      const result = await harness.runAnalysis('ws-model');

      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);
      expect(result.stages.map((stage) => stage.reused)).toEqual([
        false,
        false,
      ]);
    });

    it('reuses X1 when only the manual notes changed', async () => {
      harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.overrides.set('analysis_x2', invalidX2);
      await harness.runAnalysis('ws-c');
      harness.notes.push({
        id: 'note-new',
        workspaceId: 'ws-c',
        text: 'A note added after the failure.',
      });
      harness.overrides.clear();
      harness.provider.complete.mockClear();

      await harness.runAnalysis('ws-c');

      expect(harness.providerSteps()).toEqual(['analysis_x2']);
    });

    it('never reuses a stage from another workspace', async () => {
      harness.addWorkspace('ws-first', AnalysisStrategy.c);
      harness.overrides.set('analysis_x2', invalidX2);
      await harness.runAnalysis('ws-first');
      harness.overrides.clear();
      harness.provider.complete.mockClear();
      // Same vacancy, templates, sources and model: only the workspace differs.
      const second = harness.addWorkspace('ws-second', AnalysisStrategy.c);

      const result = await harness.runAnalysis('ws-second');

      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);
      expect(result.stages.every((stage) => !stage.reused)).toBe(true);
      expect(second.status).toBe(WorkspaceStatus.paused_after_analysis);
    });

    it('does not reuse a stage after a completed analysis', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      await harness.runAnalysis('ws-c');
      // A legacy `failed` workspace may start the analysis again (ADR-038).
      row.status = WorkspaceStatus.failed;
      harness.provider.complete.mockClear();

      await harness.runAnalysis('ws-c');

      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);
    });

    it('reuses a verified assessment when only the completion failed', async () => {
      const row = harness.addWorkspace('ws-b', AnalysisStrategy.b);
      const register = harness.artifactsService.register;
      const realRegister = register.getMockImplementation();
      register.mockImplementation((dto: { artifactType: string }) =>
        dto.artifactType === ARTIFACT_TYPES.legacyAnalysis
          ? Promise.reject(new Error('disk full'))
          : (realRegister as (input: unknown) => Promise<GeneratedArtifact>)(
              dto,
            ),
      );
      await expect(harness.runAnalysis('ws-b')).rejects.toThrow('disk full');
      expect(row.lastStepErrorMessage).toBe(
        'Vacancy analysis failed: analysis_b: disk full',
      );
      register.mockImplementation(
        realRegister as (input: unknown) => Promise<GeneratedArtifact>,
      );
      harness.provider.complete.mockClear();

      const result = await harness.runAnalysis('ws-b');

      expect(harness.providerSteps()).toEqual([]);
      expect(result.stages).toEqual([
        expect.objectContaining({ key: 'analysis_b', reused: true }),
      ]);
      expect(row.status).toBe(WorkspaceStatus.paused_after_analysis);
    });
    it('does not reuse an assessment after the context profile changed', async () => {
      const row = harness.addWorkspace('ws-b', AnalysisStrategy.b);
      const register = harness.artifactsService.register;
      const realRegister = register.getMockImplementation() as (
        input: unknown,
      ) => Promise<GeneratedArtifact>;
      register.mockImplementation((dto: { artifactType: string }) =>
        dto.artifactType === ARTIFACT_TYPES.legacyAnalysis
          ? Promise.reject(new Error('disk full'))
          : realRegister(dto),
      );
      await expect(harness.runAnalysis('ws-b')).rejects.toThrow('disk full');
      register.mockImplementation(realRegister);
      // The profile is part of the B identity: the registered result is no longer reusable.
      row.contextLayout = ContextLayout.boundary;
      harness.provider.complete.mockClear();

      const result = await harness.runAnalysis('ws-b');

      expect(harness.providerSteps()).toEqual(['analysis_b']);
      expect(result.stages).toEqual([
        expect.objectContaining({ key: 'analysis_b', reused: false }),
      ]);
      const [first, second] = harness.runs;
      expect(second.inputHash).not.toBe(first.inputHash);
    });
  });

  describe('concurrent runs', () => {
    it('keeps X1 in flight until the X2 run exists', async () => {
      harness.addWorkspace('ws-c', AnalysisStrategy.c);
      const statusesAtX2Create: string[] = [];
      const create = harness.promptRuns.create;
      const realCreate = create.getMockImplementation() as (
        dto: Parameters<typeof create>[0],
      ) => Promise<PromptRun>;
      create.mockImplementation((dto) => {
        if (dto.promptStep === 'analysis_x2') {
          statusesAtX2Create.push(harness.runs[0].status);
        }
        return realCreate(dto);
      });

      await harness.runAnalysis('ws-c');

      expect(statusesAtX2Create).toEqual([PromptRunStatus.running]);
      expect(harness.runs.map((run) => run.status)).toEqual([
        PromptRunStatus.completed,
        PromptRunStatus.completed,
      ]);
      expect(harness.runs[0].aiRunId).toBe(harness.aiRuns[0].id);
    });

    it('refuses a second run while a stage of the first is in flight', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      let secondRun: unknown = null;
      const fake = new FakeAiProvider();
      harness.overrides.set('analysis_x2', async () => {
        // The first run is between its stages' bookkeeping: X1 is done, X2 is being paid for.
        secondRun = await harness
          .runAnalysis('ws-c')
          .catch((error: unknown) => error);
        return fake.complete('p', 'c', { jsonMode: true, step: 'analysis_x2' });
      });

      await harness.runAnalysis('ws-c');

      expect(secondRun).toBeInstanceOf(ConflictException);
      expect(harness.providerSteps()).toEqual(['analysis_x1', 'analysis_x2']);
      expect(harness.runs.map((run) => run.promptStep)).toEqual([
        'analysis_x1',
        'analysis_x2',
      ]);
      expect(row.status).toBe(WorkspaceStatus.paused_after_analysis);
      expect(row.lastStepErrorStep).toBeNull();
    });

    it('does not roll back when the next stage run is held by another run', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      const create = harness.promptRuns.create;
      const realCreate = create.getMockImplementation() as (
        dto: Parameters<typeof create>[0],
      ) => Promise<PromptRun>;
      create.mockImplementation((dto) =>
        dto.promptStep === 'analysis_x2'
          ? Promise.reject(new ConflictException('already running'))
          : realCreate(dto),
      );

      await expect(harness.runAnalysis('ws-c')).rejects.toThrow(
        ConflictException,
      );

      // The other run owns the workspace now: no rollback, no recorded error.
      expect(row.status).toBe(WorkspaceStatus.analysis_running);
      expect(row.lastStepErrorStep).toBeNull();
      // X1 succeeded and stays completed and reusable.
      expect(harness.runs.map((run) => run.status)).toEqual([
        PromptRunStatus.completed,
      ]);
    });

    it('ignores a stale stage run of a dead process', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c, {
        status: WorkspaceStatus.analysis_running,
      });
      harness.runs.push({
        id: 'run-dead',
        workspaceId: 'ws-c',
        promptStep: 'analysis_x1',
        status: PromptRunStatus.running,
        updatedAt: new Date(Date.now() - 16 * 60 * 1000),
      } as PromptRun);

      await harness.runAnalysis('ws-c');

      expect(row.status).toBe(WorkspaceStatus.paused_after_analysis);
    });
  });

  describe('refusals before any paid call', () => {
    it('refuses while an analysis stage of the workspace is in flight', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c, {
        status: WorkspaceStatus.analysis_running,
      });
      harness.runs.push({
        id: 'run-live',
        workspaceId: 'ws-c',
        promptStep: 'analysis_x2',
        status: PromptRunStatus.pending,
        updatedAt: new Date(),
      } as PromptRun);

      await expect(harness.runAnalysis('ws-c')).rejects.toThrow(
        'Analysis stage "analysis_x2" is already running',
      );
      expect(harness.provider.complete).not.toHaveBeenCalled();
      expect(row.status).toBe(WorkspaceStatus.analysis_running);
      expect(row.lastStepErrorStep).toBeNull();
    });

    it('refuses an empty stage plan', async () => {
      harness.addWorkspace('ws-c', AnalysisStrategy.c);

      await expect(harness.service.runAnalysis('ws-c', [])).rejects.toThrow(
        BadRequestException,
      );
      expect(harness.provider.complete).not.toHaveBeenCalled();
    });

    it('refuses a workspace outside the analysis start statuses', async () => {
      harness.addWorkspace('ws-c', AnalysisStrategy.c, {
        status: WorkspaceStatus.paused_after_analysis,
      });

      await expect(harness.runAnalysis('ws-c')).rejects.toThrow(
        BadRequestException,
      );
      expect(harness.runs).toEqual([]);
    });

    it('refuses without an active stage template', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.templates.findActive.mockResolvedValueOnce(null);

      await expect(harness.runAnalysis('ws-c')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(harness.runs).toEqual([]);
      expect(row.status).toBe(WorkspaceStatus.source_saved);
    });

    it('leaves the workspace untouched while the stage is already running', async () => {
      const row = harness.addWorkspace('ws-c', AnalysisStrategy.c);
      harness.promptRuns.create.mockRejectedValueOnce(
        new ConflictException('already running'),
      );

      await expect(harness.runAnalysis('ws-c')).rejects.toThrow(
        ConflictException,
      );
      expect(row.status).toBe(WorkspaceStatus.source_saved);
      expect(row.lastStepErrorStep).toBeNull();
      expect(harness.provider.complete).not.toHaveBeenCalled();
    });
  });
});
