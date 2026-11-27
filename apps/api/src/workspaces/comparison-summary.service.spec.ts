import { NotFoundException } from '@nestjs/common';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  WorkspaceStatus,
} from '@prisma/client';
import { ESTIMATE_LABEL } from '../ai/pricing';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiStepsService } from '../queue/ai-steps.service';
import { ComparisonSummaryService } from './comparison-summary.service';
import { WorkspacesService } from './workspaces.service';

// The comparison summary over in-memory rows: workspaces, their analysis runs with AiRuns, notes
// with their applications and registered artifacts. The usage breakdown and the pricing table are
// the real ones from `src/ai/`.

const VACANCY_HASH = 'vacancy-hash';
const BASE_TIME = new Date('2026-11-27T10:00:00Z').getTime();
const at = (seconds: number) => new Date(BASE_TIME + seconds * 1000);

// Stored Chat Completions usage (synthetic counts): input 10,000 = uncached 1,000 + reads 2,000 +
// writes 7,000; output 800 including 300 reasoning tokens.
const USAGE_JSON = JSON.stringify({
  prompt_tokens: 10_000,
  completion_tokens: 800,
  total_tokens: 10_800,
  prompt_tokens_details: { cached_tokens: 2_000, cache_write_tokens: 7_000 },
  completion_tokens_details: { reasoning_tokens: 300 },
});
// The gpt-6-luna list price of that call: (1,000 × 0.10 + 2,000 × 0.01 + 7,000 × 0.125
// + 800 × 0.50) / 1M.
const CALL_COST =
  (1_000 * 0.1 + 2_000 * 0.01 + 7_000 * 0.125 + 800 * 0.5) / 1e6;

const sourcesSnapshot = (hashOf: Record<string, string> = {}) =>
  JSON.stringify({
    snapshotId: 'snap-1',
    catalogHash: 'catalog',
    knowledgeSources: ['career_cases', 'cv_rules', 'tech_stack'].map(
      (sourceType) => ({
        id: `ks-${sourceType}`,
        filePath: `/sources/${sourceType}.md`,
        sourceType,
        contentHash: hashOf[sourceType] ?? `hash-${sourceType}`,
        versionLabel: null,
      }),
    ),
  });

// X1 records the `cv_rules` row it took its AI-weight excerpt from.
const extractionSnapshot = (cvRulesHash = 'hash-cv_rules') =>
  JSON.stringify({
    aiWeightExcerptHash: `excerpt-of-${cvRulesHash}`,
    knowledgeSources: [
      {
        id: 'ks-cv_rules',
        filePath: '/sources/cv_rules.md',
        sourceType: 'cv_rules',
        contentHash: cvRulesHash,
        versionLabel: null,
      },
    ],
  });

// Prompt 1 records the entry list itself, not the object of the X2 / B stage.
const legacySnapshot = () =>
  JSON.stringify(
    (JSON.parse(sourcesSnapshot()) as { knowledgeSources: unknown[] })
      .knowledgeSources,
  );

interface WorkspaceRow {
  id: string;
  workspaceSlug: string;
  comparisonGroupId: string | null;
  forkedFromWorkspaceId: string | null;
  analysisStrategy: AnalysisStrategy;
  contextLayout: ContextLayout;
  contextSourceSet: ContextSourceSet;
  status: WorkspaceStatus;
  isArchived: boolean;
  currentDecision: string | null;
  originalDecision: string | null;
  score: number | null;
  lastStepErrorStep: string | null;
  lastStepErrorMessage: string | null;
  lastStepErrorAt: Date | null;
  createdAt: Date;
  storageRoot: string;
  workspacePath: string;
  company: { nameOriginal: string; companySlug: string };
  jobVacancy: {
    roleTitleOriginal: string;
    roleSlug: string;
    vacancyTextHash: string;
  };
}

interface RunRow {
  id: string;
  workspaceId: string;
  promptStep: string;
  sourceSnapshot: string | null;
  createdAt: Date;
  aiRun: {
    id: string;
    provider: string;
    model: string;
    status: string;
    usageRawJson: string | null;
    createdAt: Date;
  } | null;
}

interface ArtifactRow {
  workspaceId: string;
  artifactType: string;
  promptRunId: string | null;
  origin: string;
  isLatest: boolean;
}

const createHarness = () => {
  const workspaces: WorkspaceRow[] = [];
  const runs: RunRow[] = [];
  const artifacts: ArtifactRow[] = [];
  const notes: {
    workspaceId: string;
    text: string;
    createdAt: Date;
    applications: { promptRunId: string }[];
  }[] = [];

  const addWorkspace = (id: string, overrides: Partial<WorkspaceRow> = {}) => {
    const row: WorkspaceRow = {
      id,
      workspaceSlug: `slug_${id}`,
      comparisonGroupId: null,
      forkedFromWorkspaceId: null,
      analysisStrategy: AnalysisStrategy.legacy,
      contextLayout: ContextLayout.single,
      contextSourceSet: ContextSourceSet.full,
      status: WorkspaceStatus.source_saved,
      isArchived: false,
      currentDecision: null,
      originalDecision: null,
      score: null,
      lastStepErrorStep: null,
      lastStepErrorMessage: null,
      lastStepErrorAt: null,
      createdAt: at(workspaces.length),
      storageRoot: '/storage',
      workspacePath: id,
      company: {
        nameOriginal: 'Sample Company',
        companySlug: 'Sample_Company',
      },
      jobVacancy: {
        roleTitleOriginal: 'Backend Role',
        roleSlug: 'Backend_Role',
        vacancyTextHash: VACANCY_HASH,
      },
      ...overrides,
    };
    workspaces.push(row);
    return row;
  };

  // One provider call of a step: its run starts at `startSeconds`, its AiRun is saved
  // `durationSeconds` later.
  const addCall = (
    workspaceId: string,
    promptStep: string,
    {
      startSeconds = 0,
      durationSeconds = 5,
      model = 'gpt-6-luna',
      usageRawJson = USAGE_JSON as string | null,
      status = 'completed',
      sourceSnapshot = null as string | null,
    } = {},
  ): RunRow => {
    const id = `${workspaceId}-${promptStep}-${runs.length + 1}`;
    const run: RunRow = {
      id,
      workspaceId,
      promptStep,
      sourceSnapshot,
      createdAt: at(startSeconds),
      aiRun: {
        id: `${id}-ai`,
        provider: 'openai',
        model,
        status,
        usageRawJson,
        createdAt: at(startSeconds + durationSeconds),
      },
    };
    runs.push(run);
    return run;
  };

  const addArtifact = (row: ArtifactRow) => artifacts.push(row);

  // A completed analysis: the run that produced the latest `01` (and the `01a` for C).
  const completeAnalysis = (
    workspaceId: string,
    analysisRun: RunRow,
    requirementsRun: RunRow | null = null,
  ) => {
    addArtifact({
      workspaceId,
      artifactType: 'vacancy_analysis_json',
      promptRunId: analysisRun.id,
      origin: analysisRun.promptStep,
      isLatest: true,
    });
    if (requirementsRun) {
      addArtifact({
        workspaceId,
        artifactType: 'vacancy_requirements_json',
        promptRunId: requirementsRun.id,
        origin:
          requirementsRun.workspaceId === workspaceId
            ? requirementsRun.promptStep
            : 'carried_over',
        isLatest: true,
      });
    }
  };

  const prisma = {
    applicationWorkspace: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(workspaces.find((row) => row.id === where.id) ?? null),
      ),
      findMany: jest.fn(
        ({
          where,
        }: {
          where: { OR: [{ comparisonGroupId: string }, { id: string }] };
        }) => {
          const [byGroup, byId] = where.OR;
          return Promise.resolve(
            workspaces
              .filter(
                (row) =>
                  row.comparisonGroupId === byGroup.comparisonGroupId ||
                  row.id === byId.id,
              )
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
          );
        },
      ),
    },
    promptRun: {
      findMany: jest.fn(
        ({
          where,
        }: {
          where: { workspaceId: string; promptStep: { in: string[] } };
        }) =>
          Promise.resolve(
            runs.filter(
              (run) =>
                run.workspaceId === where.workspaceId &&
                where.promptStep.in.includes(run.promptStep),
            ),
          ),
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(runs.find((run) => run.id === where.id) ?? null),
      ),
    },
    manualNote: {
      findMany: jest.fn(({ where }: { where: { workspaceId: string } }) =>
        Promise.resolve(
          notes.filter((note) => note.workspaceId === where.workspaceId),
        ),
      ),
    },
  };
  const artifactsService = {
    findByWorkspaceId: jest.fn((workspaceId: string) =>
      Promise.resolve(
        artifacts.filter((artifact) => artifact.workspaceId === workspaceId),
      ),
    ),
  };
  const workspacesService = {
    findAnalysisPolicy: jest.fn(
      (_workspace: { id: string }): Promise<unknown> => Promise.resolve(null),
    ),
  };
  const aiSteps = {
    findActiveJob: jest.fn((_workspaceId: string) =>
      Promise.resolve<{ jobId: string; step: string; state: string } | null>(
        null,
      ),
    ),
  };
  const service = new ComparisonSummaryService(
    prisma as unknown as PrismaService,
    artifactsService as unknown as ArtifactsService,
    workspacesService as unknown as WorkspacesService,
    aiSteps as unknown as AiStepsService,
  );

  return {
    service,
    workspaces,
    runs,
    notes,
    aiSteps,
    workspacesService,
    addWorkspace,
    addCall,
    addArtifact,
    completeAnalysis,
  };
};

type Harness = ReturnType<typeof createHarness>;

// A source and two forks in its group, each with a completed analysis by its strategy.
const groupOfThree = (harness: Harness) => {
  const group = { comparisonGroupId: 'source' };
  harness.addWorkspace('source', group);
  harness.addWorkspace('fork-b', {
    ...group,
    forkedFromWorkspaceId: 'source',
    analysisStrategy: AnalysisStrategy.b,
  });
  harness.addWorkspace('fork-c', {
    ...group,
    forkedFromWorkspaceId: 'source',
    analysisStrategy: AnalysisStrategy.c,
  });
  harness.completeAnalysis(
    'source',
    harness.addCall('source', 'prompt_1', {
      sourceSnapshot: legacySnapshot(),
    }),
  );
  const b = harness.addCall('fork-b', 'analysis_b', {
    sourceSnapshot: sourcesSnapshot(),
  });
  harness.completeAnalysis('fork-b', b, b);
  const x1 = harness.addCall('fork-c', 'analysis_x1', {
    durationSeconds: 2,
    sourceSnapshot: extractionSnapshot(),
  });
  const x2 = harness.addCall('fork-c', 'analysis_x2', {
    startSeconds: 3,
    durationSeconds: 7,
    sourceSnapshot: sourcesSnapshot(),
  });
  harness.completeAnalysis('fork-c', x2, x1);
};

const memberOf = (
  summary: Awaited<ReturnType<ComparisonSummaryService['buildSummary']>>,
  workspaceId: string,
) => {
  const member = summary.members.find(
    (item) => item.workspaceId === workspaceId,
  );
  if (!member) throw new Error(`no member ${workspaceId}`);
  return member;
};

describe('ComparisonSummaryService', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('reports usage and a labelled estimate per member', async () => {
    groupOfThree(harness);

    const summary = await harness.service.buildSummary('fork-c');

    const forkC = memberOf(summary, 'fork-c');
    expect(forkC.stages.map((stage) => stage.stepKey)).toEqual([
      'analysis_x1',
      'analysis_x2',
    ]);
    const [x1, x2] = forkC.stages;
    expect(x1).toMatchObject({
      isCarriedOver: false,
      promptRunCount: 1,
      callCount: 1,
      durationMs: 2_000,
      models: ['openai/gpt-6-luna'],
      usage: {
        isMeasured: true,
        inputTokens: 10_000,
        cacheReadTokens: 2_000,
        cacheWriteTokens: 7_000,
        outputTokens: 800,
        reasoningTokens: 300,
      },
    });
    expect(x2.durationMs).toBe(7_000);
    expect(x1.estimate.amount).toBeCloseTo(CALL_COST, 12);
    expect(forkC.totals).toMatchObject({
      callCount: 2,
      failedCallCount: 0,
      unmeasuredCallCount: 0,
      durationMs: 9_000,
      usage: {
        isMeasured: true,
        inputTokens: 20_000,
        cacheReadTokens: 4_000,
        cacheWriteTokens: 14_000,
        outputTokens: 1_600,
        reasoningTokens: 600,
      },
    });
    // The estimate is its own field, labelled, next to the measured usage.
    expect(forkC.totals.estimate).toMatchObject({
      isEstimate: true,
      label: ESTIMATE_LABEL,
      currency: 'USD',
      reason: null,
    });
    expect(forkC.totals.estimate.amount).toBeCloseTo(2 * CALL_COST, 12);
    expect(memberOf(summary, 'source').stages.map((s) => s.stepKey)).toEqual([
      'prompt_1',
    ]);
    expect(memberOf(summary, 'fork-b').totals.callCount).toBe(1);
  });

  it('counts failed calls and retries of a stage', async () => {
    harness.addWorkspace('ws-c', { analysisStrategy: AnalysisStrategy.c });
    harness.addCall('ws-c', 'analysis_x1');
    harness.addCall('ws-c', 'analysis_x2', {
      startSeconds: 10,
      status: 'failed',
      usageRawJson: null,
    });
    harness.addCall('ws-c', 'analysis_x2', { startSeconds: 30 });

    const summary = await harness.service.buildSummary('ws-c');

    const x2 = memberOf(summary, 'ws-c').stages[1];
    expect(x2).toMatchObject({
      stepKey: 'analysis_x2',
      promptRunCount: 2,
      callCount: 2,
      failedCallCount: 1,
      unmeasuredCallCount: 1,
    });
    expect(x2.usage.inputTokens).toBe(10_000);
    expect(x2.estimate.amount).toBeCloseTo(CALL_COST, 12);
    expect(x2.estimate.reason).toBe(
      'covers 1 of 2 calls; 1 without recorded usage are not included',
    );
  });

  it('reports a member without usage', async () => {
    const group = { comparisonGroupId: 'never-run' };
    harness.addWorkspace('never-run', group);
    harness.addWorkspace('no-usage', {
      ...group,
      forkedFromWorkspaceId: 'never-run',
    });
    harness.addCall('no-usage', 'prompt_1', { usageRawJson: null });

    const summary = await harness.service.buildSummary('never-run');

    const neverRun = memberOf(summary, 'never-run');
    expect(neverRun.stages).toEqual([]);
    expect(neverRun.totals).toMatchObject({
      callCount: 0,
      usage: {
        isMeasured: false,
        inputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
      },
      estimate: { amount: null, reason: 'no provider call' },
    });
    const noUsage = memberOf(summary, 'no-usage');
    expect(noUsage.totals).toMatchObject({
      callCount: 1,
      unmeasuredCallCount: 1,
      usage: { isMeasured: false, inputTokens: 0, outputTokens: 0 },
      estimate: {
        amount: null,
        reason: 'no call of this group has recorded usage',
      },
    });
  });

  it('excludes workspaces outside the group', async () => {
    groupOfThree(harness);
    harness.addWorkspace('other-group-member', {
      comparisonGroupId: 'other-source',
    });
    harness.addWorkspace('other-source', { comparisonGroupId: 'other-source' });
    harness.addWorkspace('lonely');

    const summary = await harness.service.buildSummary('source');

    expect(summary.comparisonGroupId).toBe('source');
    expect(summary.members.map((member) => member.workspaceId)).toEqual([
      'source',
      'fork-b',
      'fork-c',
    ]);
    expect(memberOf(summary, 'source')).toMatchObject({
      isGroupRoot: true,
      isRequested: true,
    });
  });

  it('reports status, active job and step error per member', async () => {
    const group = { comparisonGroupId: 'source' };
    harness.addWorkspace('source', {
      ...group,
      status: WorkspaceStatus.paused_after_analysis,
      currentDecision: 'apply',
      originalDecision: 'apply',
      score: 82,
    });
    harness.addWorkspace('running', {
      ...group,
      forkedFromWorkspaceId: 'source',
      status: WorkspaceStatus.analysis_running,
      analysisStrategy: AnalysisStrategy.b,
    });
    harness.addWorkspace('rolled-back', {
      ...group,
      forkedFromWorkspaceId: 'source',
      analysisStrategy: AnalysisStrategy.c,
      lastStepErrorStep: 'prompt_1',
      lastStepErrorMessage: 'analysis_x2: the answer failed validation',
      lastStepErrorAt: at(60),
    });
    harness.aiSteps.findActiveJob.mockImplementation((workspaceId: string) =>
      Promise.resolve(
        workspaceId === 'running'
          ? { jobId: 'prompt_1-running', step: 'prompt_1', state: 'active' }
          : null,
      ),
    );

    const summary = await harness.service.buildSummary('running');

    expect(summary.members).toHaveLength(3);
    expect(
      summary.members.map((member) => ({
        id: member.workspaceId,
        status: member.status,
        activeJob: member.activeJob,
        lastStepError: member.lastStepError,
      })),
    ).toEqual([
      {
        id: 'source',
        status: WorkspaceStatus.paused_after_analysis,
        activeJob: { state: 'none', jobId: null, step: null },
        lastStepError: null,
      },
      {
        id: 'running',
        status: WorkspaceStatus.analysis_running,
        activeJob: {
          state: 'active',
          jobId: 'prompt_1-running',
          step: 'prompt_1',
        },
        lastStepError: null,
      },
      {
        id: 'rolled-back',
        status: WorkspaceStatus.source_saved,
        activeJob: { state: 'none', jobId: null, step: null },
        lastStepError: {
          step: 'prompt_1',
          message: 'analysis_x2: the answer failed validation',
          at: at(60),
        },
      },
    ]);
    expect(memberOf(summary, 'source')).toMatchObject({
      currentDecision: 'apply',
      score: 82,
    });
  });

  it('degrades the job state when the queue is unavailable', async () => {
    groupOfThree(harness);
    harness.aiSteps.findActiveJob.mockRejectedValue(
      new Error('REDIS_URL is not configured'),
    );

    const summary = await harness.service.buildSummary('source');

    expect(summary.members).toHaveLength(3);
    for (const member of summary.members) {
      expect(member.activeJob).toEqual({
        state: 'unknown',
        jobId: null,
        step: null,
      });
    }
  });

  it('returns the workspace itself when it has no group', async () => {
    harness.addWorkspace('lonely');
    harness.addWorkspace('someone-else', { comparisonGroupId: 'someone-else' });

    const summary = await harness.service.buildSummary('lonely');

    expect(summary.comparisonGroupId).toBeNull();
    expect(summary.members.map((member) => member.workspaceId)).toEqual([
      'lonely',
    ]);
    expect(summary.members[0]).toMatchObject({
      isRequested: true,
      isGroupRoot: false,
    });
  });

  it('treats a single-member group as equal inputs', async () => {
    harness.addWorkspace('lonely', { analysisStrategy: AnalysisStrategy.b });
    const run = harness.addCall('lonely', 'analysis_b', {
      sourceSnapshot: sourcesSnapshot(),
    });
    harness.completeAnalysis('lonely', run, run);

    const summary = await harness.service.buildSummary('lonely');

    expect(summary.inputEquality).toEqual({
      vacancyHash: { isEqual: true, unrecordedWorkspaceIds: [] },
      companyAndRole: { isEqual: true, unrecordedWorkspaceIds: [] },
      notes: { isEqual: true, unrecordedWorkspaceIds: [] },
      snapshot: { isEqual: true, unrecordedWorkspaceIds: [] },
      model: { isEqual: true, unrecordedWorkspaceIds: [] },
    });
  });

  it('flags unequal inputs across the group', async () => {
    groupOfThree(harness);

    const equal = await harness.service.buildSummary('source');

    // The legacy Prompt 1 list and the experimental snapshot object hold the same sources.
    expect(equal.inputEquality.snapshot).toEqual({
      isEqual: true,
      unrecordedWorkspaceIds: [],
    });
    expect(equal.inputEquality.model.isEqual).toBe(true);

    // fork-c's X2 read another career_cases version; fork-b ran on another model.
    const x2 = harness.runs.find((run) => run.promptStep === 'analysis_x2');
    (x2 as { sourceSnapshot: string }).sourceSnapshot = sourcesSnapshot({
      career_cases: 'hash-career-cases-v2',
    });
    const b = harness.runs.find((run) => run.promptStep === 'analysis_b');
    (b?.aiRun as { model: string }).model = 'gpt-5.6-luna';

    const unequal = await harness.service.buildSummary('source');

    expect(unequal.inputEquality.snapshot.isEqual).toBe(false);
    expect(unequal.inputEquality.model.isEqual).toBe(false);
    expect(unequal.inputEquality.vacancyHash.isEqual).toBe(true);
    expect(unequal.inputEquality.companyAndRole.isEqual).toBe(true);
    expect(unequal.inputEquality.notes.isEqual).toBe(true);

    // The other three inputs: another vacancy hash, role value and note text.
    const forkB = harness.workspaces.find((row) => row.id === 'fork-b');
    (forkB as WorkspaceRow).jobVacancy = {
      roleTitleOriginal: 'Backend Role (edited)',
      roleSlug: 'Backend_Role_edited',
      vacancyTextHash: 'another-hash',
    };
    harness.notes.push({
      workspaceId: 'fork-c',
      text: 'A note only fork-c read',
      createdAt: at(1),
      applications: [
        {
          promptRunId: (x2 as { id: string }).id,
        },
      ],
    });

    const differing = await harness.service.buildSummary('source');

    expect(differing.inputEquality.vacancyHash.isEqual).toBe(false);
    expect(differing.inputEquality.companyAndRole.isEqual).toBe(false);
    expect(differing.inputEquality.notes.isEqual).toBe(false);
  });

  it('compares the sources of the X1 run that produced the 01a', async () => {
    // The assessment source set leaves cv_rules out of X2, so only X1 read it.
    const assessmentX2Snapshot = JSON.stringify({
      ...(JSON.parse(sourcesSnapshot()) as Record<string, unknown>),
      knowledgeSources: (
        JSON.parse(sourcesSnapshot()) as {
          knowledgeSources: { sourceType: string }[];
        }
      ).knowledgeSources.filter((source) => source.sourceType !== 'cv_rules'),
    });
    const group = { comparisonGroupId: 'first' };
    for (const [id, cvRulesHash] of [
      ['first', 'hash-cv_rules'],
      ['second', 'hash-cv_rules-v2'],
    ]) {
      harness.addWorkspace(id, {
        ...group,
        forkedFromWorkspaceId: id === 'first' ? null : 'first',
        analysisStrategy: AnalysisStrategy.c,
        contextSourceSet: ContextSourceSet.assessment,
      });
      const x1 = harness.addCall(id, 'analysis_x1', {
        sourceSnapshot: extractionSnapshot(cvRulesHash),
      });
      const x2 = harness.addCall(id, 'analysis_x2', {
        sourceSnapshot: assessmentX2Snapshot,
      });
      harness.completeAnalysis(id, x2, x1);
    }

    const summary = await harness.service.buildSummary('first');

    expect(summary.inputEquality.snapshot).toEqual({
      isEqual: false,
      unrecordedWorkspaceIds: [],
    });

    // The same cv_rules for both X1 runs: equal.
    const secondX1 = harness.runs.find(
      (run) => run.workspaceId === 'second' && run.promptStep === 'analysis_x1',
    );
    (secondX1 as RunRow).sourceSnapshot = extractionSnapshot('hash-cv_rules');
    const equal = await harness.service.buildSummary('first');
    expect(equal.inputEquality.snapshot.isEqual).toBe(true);
  });

  it('compares the notes the analysis read, not notes added after it', async () => {
    groupOfThree(harness);
    harness.notes.push({
      workspaceId: 'fork-b',
      text: 'Added after the analysis',
      createdAt: at(100),
      applications: [],
    });

    const summary = await harness.service.buildSummary('source');

    expect(summary.inputEquality.notes.isEqual).toBe(true);
  });

  it('names members without a recorded analysis input', async () => {
    const group = { comparisonGroupId: 'source' };
    harness.addWorkspace('source', group);
    harness.addWorkspace('not-run', {
      ...group,
      forkedFromWorkspaceId: 'source',
    });
    harness.addWorkspace('failed', {
      ...group,
      forkedFromWorkspaceId: 'source',
      analysisStrategy: AnalysisStrategy.c,
    });
    harness.addCall('failed', 'analysis_x1');
    harness.addCall('failed', 'analysis_x2', {
      status: 'failed',
      usageRawJson: null,
    });
    const run = harness.addCall('source', 'prompt_1', {
      sourceSnapshot: legacySnapshot(),
    });
    harness.completeAnalysis('source', run);

    const summary = await harness.service.buildSummary('source');

    expect(summary.inputEquality.snapshot).toEqual({
      isEqual: true,
      unrecordedWorkspaceIds: ['not-run', 'failed'],
    });
    expect(summary.inputEquality.model).toEqual({
      isEqual: true,
      unrecordedWorkspaceIds: ['not-run', 'failed'],
    });
    // Stored inputs are recorded for every member.
    expect(summary.inputEquality.vacancyHash.unrecordedWorkspaceIds).toEqual(
      [],
    );
    expect(summary.inputEquality.notes.unrecordedWorkspaceIds).toEqual([]);
  });

  it('reports an unreadable snapshot as unrecorded, not as equal', async () => {
    harness.addWorkspace('ws-b', { analysisStrategy: AnalysisStrategy.b });
    const run = harness.addCall('ws-b', 'analysis_b', {
      sourceSnapshot: '{"knowledgeSources":[{"id":"ks"}]}',
    });
    harness.completeAnalysis('ws-b', run, run);

    const summary = await harness.service.buildSummary('ws-b');

    expect(summary.inputEquality.snapshot.unrecordedWorkspaceIds).toEqual([
      'ws-b',
    ]);
  });

  it('does not count a carried-over X1 call in the fork', async () => {
    const group = { comparisonGroupId: 'source' };
    harness.addWorkspace('source', {
      ...group,
      analysisStrategy: AnalysisStrategy.c,
    });
    const sourceX1 = harness.addCall('source', 'analysis_x1', {
      sourceSnapshot: extractionSnapshot(),
    });
    const sourceX2 = harness.addCall('source', 'analysis_x2', {
      startSeconds: 10,
      sourceSnapshot: sourcesSnapshot(),
    });
    harness.completeAnalysis('source', sourceX2, sourceX1);
    harness.addWorkspace('factor-fork', {
      ...group,
      forkedFromWorkspaceId: 'source',
      analysisStrategy: AnalysisStrategy.c,
      contextLayout: ContextLayout.boundary,
    });
    const forkX2 = harness.addCall('factor-fork', 'analysis_x2', {
      startSeconds: 40,
      sourceSnapshot: sourcesSnapshot(),
    });
    harness.completeAnalysis('factor-fork', forkX2, sourceX1);

    const summary = await harness.service.buildSummary('factor-fork');

    const fork = memberOf(summary, 'factor-fork');
    expect(fork.carryOverRequirements).toBe(true);
    expect(fork.stages.map((stage) => stage.stepKey)).toEqual([
      'analysis_x1',
      'analysis_x2',
    ]);
    const [x1] = fork.stages;
    expect(x1).toMatchObject({
      isCarriedOver: true,
      carriedOverFromWorkspaceId: 'source',
      promptRunCount: 0,
      callCount: 0,
      durationMs: 0,
      models: [],
      usage: { isMeasured: false, inputTokens: 0, outputTokens: 0 },
      estimate: { amount: null },
    });
    expect(fork.totals.callCount).toBe(1);
    expect(fork.totals.usage.inputTokens).toBe(10_000);
    expect(fork.totals.estimate.amount).toBeCloseTo(CALL_COST, 12);
    // The X1 call is the source's, counted once, in the source's row.
    const source = memberOf(summary, 'source');
    expect(source.carryOverRequirements).toBe(false);
    expect(source.stages[0]).toMatchObject({
      stepKey: 'analysis_x1',
      isCarriedOver: false,
      callCount: 1,
    });
    expect(source.totals.callCount).toBe(2);
    // The fork's model input includes the carried X1's recorded model.
    expect(summary.inputEquality.model.isEqual).toBe(true);
  });

  it('reports a carried 01a the runner did not reuse as the fork own X1 calls', async () => {
    const group = { comparisonGroupId: 'source' };
    harness.addWorkspace('source', {
      ...group,
      analysisStrategy: AnalysisStrategy.c,
    });
    const sourceX1 = harness.addCall('source', 'analysis_x1', {
      sourceSnapshot: extractionSnapshot(),
    });
    const sourceX2 = harness.addCall('source', 'analysis_x2', {
      sourceSnapshot: sourcesSnapshot(),
    });
    harness.completeAnalysis('source', sourceX2, sourceX1);
    harness.addWorkspace('stale-carry', {
      ...group,
      forkedFromWorkspaceId: 'source',
      analysisStrategy: AnalysisStrategy.c,
    });
    // The carried 01a stays latest, but its identity no longer matched: the fork ran X1 itself
    // and that call failed.
    harness.addArtifact({
      workspaceId: 'stale-carry',
      artifactType: 'vacancy_requirements_json',
      promptRunId: sourceX1.id,
      origin: 'carried_over',
      isLatest: true,
    });
    harness.addCall('stale-carry', 'analysis_x1', {
      status: 'failed',
      usageRawJson: null,
    });

    const summary = await harness.service.buildSummary('stale-carry');

    const fork = memberOf(summary, 'stale-carry');
    expect(fork.carryOverRequirements).toBe(true);
    expect(fork.stages).toEqual([
      expect.objectContaining({
        stepKey: 'analysis_x1',
        isCarriedOver: false,
        carriedOverFromWorkspaceId: null,
        callCount: 1,
        failedCallCount: 1,
      }),
    ]);
  });

  it('rejects an unknown workspace', async () => {
    await expect(
      harness.service.buildSummary('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes each member and its artifacts to the policy reader', async () => {
    groupOfThree(harness);
    const policy = { decision: 'apply', borderline: false };
    harness.workspacesService.findAnalysisPolicy.mockImplementation(
      (workspace: { id: string }) =>
        Promise.resolve(workspace.id === 'fork-c' ? policy : null),
    );

    const summary = await harness.service.buildSummary('source');

    expect(memberOf(summary, 'fork-c').analysisPolicy).toBe(policy);
    expect(memberOf(summary, 'source').analysisPolicy).toBeNull();
  });
});
