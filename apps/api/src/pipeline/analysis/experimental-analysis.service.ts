import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeneratedArtifact,
  ManualNote,
  Prisma,
  PromptRun,
  PromptRunStatus,
  PromptTemplate,
  VacancyDecision,
  WorkspaceStatus,
} from '@prisma/client';
import * as path from 'path';
import { AiProvider, AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { resolveStepMaxOutputTokens } from '../../config/env.validation';
import { CareerRegistryError } from '../../evidence/career-registry.parser';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PromptRunsService,
  STALE_PROMPT_RUN_MS,
} from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import {
  StepFailureService,
  describeStepFailure,
} from '../../workspaces/step-failure.service';
import { WorkspaceStatusService } from '../../workspaces/workspace-status.service';
import { VacancyAnalysis } from '../schemas/vacancy-analysis.schema';
import {
  ANALYSIS_DECISION_ARTIFACT,
  AnalysisDecision,
  validateAnalysisDecision,
} from '../structured-analysis/analysis-decision.schema';
import {
  DecisionPolicyInputError,
  runDecisionPolicy,
} from '../structured-analysis/decision-policy';
import { EvidenceCatalog } from '../structured-analysis/evidence-catalog';
import {
  FIT_ASSESSMENT_ARTIFACT,
  FitAssessment,
  validateFitAssessment,
} from '../structured-analysis/fit-assessment.schema';
import {
  LegacyProjectionError,
  projectToLegacyVacancyAnalysis,
} from '../structured-analysis/legacy-analysis-projection';
import {
  ContractValidation,
  VACANCY_REQUIREMENTS_ARTIFACT,
  VacancyRequirements,
  validateVacancyRequirements,
} from '../structured-analysis/vacancy-requirements.schema';
import {
  ANALYSIS_STAGE_KEYS,
  AnalysisStage,
  AnalysisStageKey,
  StageSnapshot,
  catalogHashOf,
  parseAssessmentAnswer,
  parseRequirementsAnswer,
  parseStageJson,
  recordSnapshotId,
  sha256,
  snapshotIdOf,
} from './analysis-stages';
import { renderCandidateConstantsBlock } from './candidate-constants-block';
import {
  AiWeightExcerptError,
  EvidenceCatalogSourceError,
  ExperimentalInputBuilderService,
  StageRequest,
  buildAssessmentRequest,
  buildExtractionRequest,
  buildStageCatalog,
} from './experimental-input-builder.service';
import {
  RESPONSE_FORMAT_JSON_OBJECT,
  computeStageIdentity,
} from './stage-identity';

// The shared stage runner of analysis strategies `b` and `c` (ADR-046 items 3, 9, 13, 15;
// ISSUE-713). It runs inside the `prompt_1` job and the `analysis_running` claim: every stage is
// its own `PromptRun` (stage key = `promptStep`) and its own `AiProvider` call; a stage whose
// verified result is already registered in this workspace after a failed attempt is not paid for
// again. The policy decides; the model's decision stays advisory.

const ANALYSIS_STEP = 'prompt_1';
const ANALYSIS_ENTRY_STATUS = WorkspaceStatus.source_saved;
const ANALYSIS_START_STATUSES: WorkspaceStatus[] = [
  WorkspaceStatus.source_saved,
  WorkspaceStatus.failed,
  WorkspaceStatus.analysis_running,
];
const VACANCY_SOURCE_FILE = '00_vacancy_source.txt';
const LEGACY_ANALYSIS_FILE = '01_vacancy_analysis.json';

export const ARTIFACT_TYPES = {
  requirements: 'vacancy_requirements_json',
  assessment: 'fit_assessment_json',
  decision: 'analysis_decision_json',
  legacyAnalysis: 'vacancy_analysis_json',
} as const;

const JSON_MIME_TYPE = 'application/json';

type WorkspaceWithNames = Prisma.ApplicationWorkspaceGetPayload<{
  include: { company: true; jobVacancy: true };
}>;

export interface StageRunSummary {
  key: AnalysisStageKey;
  promptRunId: string;
  aiRunId: string | null;
  reused: boolean;
}

export interface ExperimentalAnalysisResult {
  success: boolean;
  workspaceStatus: WorkspaceStatus;
  stages: StageRunSummary[];
  decision?: VacancyDecision;
  score?: number;
  failedStage?: AnalysisStageKey;
  validationError?: string;
}

interface RunContext {
  workspace: WorkspaceWithNames;
  workspaceAbsPath: string;
  vacancyText: string;
  manualNotes: ManualNote[];
  candidateConstantsBlock: string;
  templates: ReadonlyMap<AnalysisStageKey, PromptTemplate>;
}

interface PreparedStage {
  stage: AnalysisStage;
  template: PromptTemplate;
  request: StageRequest;
  identity: string;
  sourceSnapshot: string;
  catalog: EvidenceCatalog | null;
  snapshotId: string | null;
}

// What the stages produced so far: X1 (or B) fills the requirements, X2 (or B) the rest.
interface StageOutputs {
  requirements: VacancyRequirements | null;
  requirementsText: string | null;
  assessment: FitAssessment | null;
  decision: AnalysisDecision | null;
  projected: VacancyAnalysis | null;
  finalRunId: string | null;
}

interface AcceptedAnswer {
  requirements: VacancyRequirements;
  assessment: FitAssessment | null;
  decision: AnalysisDecision | null;
  projected: VacancyAnalysis | null;
}

// A stage run that succeeded but is completed only once the next stage run exists or the
// analysis has finished, so one stage run of the workspace is in flight for the whole analysis
// and the one-in-flight index guards the gap between two stages.
interface OpenRun {
  id: string;
  aiRunId: string;
  outputArtifactIds: string[];
}

type StageOutcome =
  | { status: 'completed'; summary: StageRunSummary; openRun: OpenRun }
  | { status: 'failed'; summary: StageRunSummary; reason: string };

// Mutable out-param: the AiRun id is recorded as soon as it exists so a later failure can link
// the failed PromptRun to it (ISSUE-543).
interface AiRunTracker {
  id?: string;
}

const decisionToEnum = (decision: AnalysisDecision['decision']) =>
  VacancyDecision[decision];

// The detail of StepFailureService's reason ("Vacancy analysis failed: <detail>"), so a provider
// error keeps its readable wording; the rollback puts the stage key in front of it (INV-11).
const failureDetail = (error: unknown): string => {
  const described = describeStepFailure(ANALYSIS_STEP, error);
  return described.slice(described.indexOf(': ') + 2);
};

// The exact request the provider receives: covers what the named components do not (labels,
// block layout, unavailable-source notes).
const requestHashOf = (request: StageRequest): string =>
  sha256(JSON.stringify([request.prompt, request.inputContext]));

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class ExperimentalAnalysisService {
  private readonly logger = new Logger(ExperimentalAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly knowledgeSources: KnowledgeSourcesService,
    private readonly inputBuilder: ExperimentalInputBuilderService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    private readonly workspaceStatus: WorkspaceStatusService,
    private readonly stepFailure: StepFailureService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  // Runs the stages the analysis selector chose for the workspace's strategy: [B], or [X1, X2]
  // for C. The runner itself never reads the strategy (INV-4).
  async runAnalysis(
    workspaceId: string,
    stages: readonly AnalysisStage[],
  ): Promise<ExperimentalAnalysisResult> {
    if (stages.length === 0) {
      throw new BadRequestException('An experimental analysis needs a stage');
    }
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }
    if (!ANALYSIS_START_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — analysis requires status "source_saved" (or "failed"/"analysis_running" to retry)`,
      );
    }

    await this.assertNoStageInFlight(workspaceId);
    const context = await this.loadContext(workspace, stages);
    const outputs: StageOutputs = {
      requirements: null,
      requirementsText: null,
      assessment: null,
      decision: null,
      projected: null,
      finalRunId: null,
    };
    const summaries: StageRunSummary[] = [];
    const openRuns: OpenRun[] = [];
    let isClaimed = false;
    let hasRunConflict = false;
    let currentStage: AnalysisStage = stages[0];
    let currentRun: PromptRun | null = null;
    const aiRunTracker: AiRunTracker = {};

    try {
      for (const stage of stages) {
        currentStage = stage;
        currentRun = null;
        aiRunTracker.id = undefined;
        const prepared = await this.prepareStage(
          stage,
          context,
          outputs,
          isClaimed,
        );
        const reused = await this.findReusableStage(prepared, context, outputs);
        if (reused) {
          this.acceptOutputs(stage, reused.accepted, reused.texts, outputs);
          outputs.finalRunId = reused.run.id;
          summaries.push({
            key: stage.key,
            promptRunId: reused.run.id,
            aiRunId: reused.run.aiRunId,
            reused: true,
          });
          continue;
        }

        // Created before the claim, as in Prompt 1: the one-in-flight index answers 409 before
        // any workspace state is touched.
        try {
          currentRun = await this.promptRuns.create({
            workspaceId,
            promptStep: stage.key,
            templateId: prepared.template.id,
            templateVersion: prepared.template.version,
            inputHash: prepared.identity,
            sourceSnapshot: prepared.sourceSnapshot,
          });
        } catch (error) {
          // Another run holds this stage: its workspace state is not ours to roll back.
          hasRunConflict = error instanceof ConflictException;
          throw error;
        }
        await this.completeOpenRuns(openRuns);
        if (!isClaimed) {
          await this.claim(workspace);
          isClaimed = true;
        }
        const outcome = await this.executeStage(
          prepared,
          currentRun,
          context,
          outputs,
          aiRunTracker,
        );
        summaries.push(outcome.summary);
        if (outcome.status === 'failed') {
          const workspaceStatus = await this.rollback(
            workspaceId,
            stage.key,
            outcome.reason,
          );
          return {
            success: false,
            workspaceStatus,
            stages: summaries,
            failedStage: stage.key,
            validationError: `${stage.key}: ${outcome.reason}`,
          };
        }
        openRuns.push(outcome.openRun);
        currentRun = null;
      }

      if (!isClaimed) {
        await this.claim(workspace);
        isClaimed = true;
      }
      const result = await this.completeAnalysis(context, outputs, summaries);
      // The analysis is complete once the workspace moved on; closing the last stage run is
      // bookkeeping that must not turn it into a failed job.
      await this.completeOpenRunsSafely(openRuns);
      return result;
    } catch (error) {
      if (currentRun) {
        await this.promptRuns.failSafely(currentRun.id, aiRunTracker.id);
      }
      await this.completeOpenRunsSafely(openRuns);
      if (isClaimed && !hasRunConflict) {
        await this.rollback(
          workspaceId,
          currentStage.key,
          failureDetail(error),
        );
      }
      throw error;
    }
  }

  // A stage run of this workspace that is still pending or running (and not stale) means another
  // analysis is in progress: refuse before any reuse, claim or paid call. With the open runs this
  // closes the gap between two stages, which no single per-stage index would hold.
  private async assertNoStageInFlight(workspaceId: string): Promise<void> {
    const inFlight = await this.prisma.promptRun.findFirst({
      where: {
        workspaceId,
        promptStep: { in: [...ANALYSIS_STAGE_KEYS] },
        status: { in: [PromptRunStatus.pending, PromptRunStatus.running] },
        updatedAt: { gte: new Date(Date.now() - STALE_PROMPT_RUN_MS) },
      },
      select: { promptStep: true },
    });
    if (inFlight) {
      throw new ConflictException(
        `Analysis stage "${inFlight.promptStep}" is already running for workspace "${workspaceId}"`,
      );
    }
  }

  private async completeOpenRuns(openRuns: OpenRun[]): Promise<void> {
    while (openRuns.length > 0) {
      const openRun = openRuns[0];
      await this.promptRuns.complete(openRun.id, {
        aiRunId: openRun.aiRunId,
        outputArtifactIds: openRun.outputArtifactIds,
      });
      openRuns.shift();
    }
  }

  // Cleanup: the open runs' stages did succeed, so they are completed, never failed; an error
  // here must not mask the error being handled.
  private async completeOpenRunsSafely(openRuns: OpenRun[]): Promise<void> {
    try {
      await this.completeOpenRuns(openRuns);
    } catch (error) {
      this.logger.warn(
        `Could not complete a finished analysis stage run: ${errorMessageOf(error)}`,
      );
    }
  }

  // ---------- before any stage ----------

  private async loadContext(
    workspace: WorkspaceWithNames,
    stages: readonly AnalysisStage[],
  ): Promise<RunContext> {
    const templates = new Map<AnalysisStageKey, PromptTemplate>();
    for (const stage of stages) {
      const template = await this.promptTemplates.findActive(stage.key);
      if (!template) {
        throw new InternalServerErrorException(
          `No active template found for analysis stage "${stage.key}"`,
        );
      }
      templates.set(stage.key, template);
    }
    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );
    const vacancyText = await this.artifactStorage.readFile(
      path.join(workspaceAbsPath, VACANCY_SOURCE_FILE),
    );
    const manualNotes = await this.prisma.manualNote.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'asc' },
    });
    return {
      workspace,
      workspaceAbsPath,
      vacancyText,
      manualNotes,
      candidateConstantsBlock: renderCandidateConstantsBlock(),
      templates,
    };
  }

  private async claim(workspace: WorkspaceWithNames): Promise<void> {
    await this.workspaceStatus.transition(
      workspace.id,
      workspace.status,
      WorkspaceStatus.analysis_running,
    );
    await this.stepFailure.clear(workspace.id, ANALYSIS_STEP);
  }

  // Builds the stage request and its identity. Nothing here is paid for; a source or catalog
  // problem is a readable refusal (before the claim it changes nothing).
  private async prepareStage(
    stage: AnalysisStage,
    context: RunContext,
    outputs: StageOutputs,
    isClaimed: boolean,
  ): Promise<PreparedStage> {
    try {
      return await this.buildPreparedStage(stage, context, outputs);
    } catch (error) {
      const isSourceProblem =
        error instanceof CareerRegistryError ||
        error instanceof AiWeightExcerptError ||
        error instanceof EvidenceCatalogSourceError;
      if (isSourceProblem && !isClaimed) {
        throw new BadRequestException(`${stage.key}: ${errorMessageOf(error)}`);
      }
      throw error;
    }
  }

  private async buildPreparedStage(
    stage: AnalysisStage,
    context: RunContext,
    outputs: StageOutputs,
  ): Promise<PreparedStage> {
    const { workspace } = context;
    const template = context.templates.get(stage.key) as PromptTemplate;
    const activeSources = await this.knowledgeSources.findActive();
    const loaded = await this.inputBuilder.loadStageSources(
      stage,
      workspace.contextSourceSet,
      activeSources,
    );
    const common = {
      templateContent: template.content,
      contractMajors: stage.contractMajors,
      model: {
        provider: this.aiProvider.providerName,
        model: this.aiProvider.modelName,
      },
      settings: {
        maxOutputTokens: resolveStepMaxOutputTokens(
          (key) => this.configService.get<number>(key),
          stage.key,
        ),
        responseFormat: RESPONSE_FORMAT_JSON_OBJECT,
      },
      vacancyText: context.vacancyText,
    };
    const knowledgeSources = loaded.sources.map((source) => ({
      id: source.id,
      filePath: source.filePath,
      sourceType: source.sourceType,
      contentHash: source.contentHash,
      versionLabel: source.versionLabel,
    }));

    if (!stage.isCandidateAware) {
      const excerpt = loaded.aiWeightExcerpt ?? '';
      const request = buildExtractionRequest(
        template.content,
        context.vacancyText,
        excerpt,
      );
      return {
        stage,
        template,
        request,
        identity: computeStageIdentity({
          ...common,
          requestHash: requestHashOf(request),
          stage: 'analysis_x1',
          aiWeightExcerpt: excerpt,
        }),
        sourceSnapshot: JSON.stringify({
          aiWeightExcerptHash: sha256(excerpt),
          knowledgeSources,
        }),
        catalog: null,
        snapshotId: null,
      };
    }

    const snapshotId = snapshotIdOf(loaded.sources);
    const catalog = buildStageCatalog(loaded.entries, snapshotId);
    const catalogHash = catalogHashOf(catalog);
    const requirementsText = stage.producesRequirements
      ? null
      : outputs.requirementsText;
    const manualNotes = context.manualNotes.map((note) => ({
      id: note.id,
      text: note.text,
    }));
    const snapshot: StageSnapshot = {
      snapshotId,
      catalogHash,
      knowledgeSources,
    };
    const request = buildAssessmentRequest({
      templateContent: template.content,
      layout: workspace.contextLayout,
      vacancyText: context.vacancyText,
      requirementsText,
      entries: loaded.entries,
      aiWeightExcerpt: loaded.aiWeightExcerpt,
      catalog,
      candidateConstantsBlock: context.candidateConstantsBlock,
      manualNotes,
    });
    return {
      stage,
      template,
      request,
      identity: computeStageIdentity({
        ...common,
        requestHash: requestHashOf(request),
        stage: stage.key === 'analysis_b' ? 'analysis_b' : 'analysis_x2',
        requirementsText,
        snapshot: knowledgeSources,
        catalogHash,
        manualNotes,
        candidateConstantsBlock: context.candidateConstantsBlock,
        contextProfile: {
          layout: workspace.contextLayout,
          sourceSet: workspace.contextSourceSet,
        },
      }),
      sourceSnapshot: JSON.stringify(snapshot),
      catalog,
      snapshotId,
    };
  }

  // ---------- recovery reuse (INV-7, INV-16) ----------

  // X1 writes `01a`; X2 writes `01b` and the policy result `01c` (which keeps the advisory
  // decision); B writes all three.
  private outputTypesOf(stage: AnalysisStage): string[] {
    return [
      ...(stage.producesRequirements ? [ARTIFACT_TYPES.requirements] : []),
      ...(stage.producesAssessment
        ? [ARTIFACT_TYPES.assessment, ARTIFACT_TYPES.decision]
        : []),
    ];
  }

  // A stage is reused only from this workspace's own latest registered artifacts, produced by a
  // run of the same stage key under the same identity, whose files still hash to the registered
  // value, and only when no analysis completed after them. The producing run's status is not
  // required: its AiRun was saved as a success before the files were written, and the content is
  // checked again below, so a run marked failed by a later bookkeeping error still counts.
  private async findReusableStage(
    prepared: PreparedStage,
    context: RunContext,
    outputs: StageOutputs,
  ): Promise<{
    run: PromptRun;
    accepted: AcceptedAnswer;
    texts: ReadonlyMap<string, string>;
  } | null> {
    const { workspace } = context;
    const artifacts = (
      await this.artifactsService.findByWorkspaceId(workspace.id)
    ).filter((artifact) => artifact.workspaceId === workspace.id);
    const latest = this.outputTypesOf(prepared.stage).map((type) =>
      artifacts.find(
        (artifact) => artifact.artifactType === type && artifact.isLatest,
      ),
    );
    if (latest.some((artifact) => artifact === undefined)) return null;
    const stageArtifacts = latest as GeneratedArtifact[];
    const runIds = new Set(stageArtifacts.map((item) => item.promptRunId));
    const [runId] = [...runIds];
    if (runIds.size !== 1 || !runId) return null;

    const earliest = Math.min(
      ...stageArtifacts.map((artifact) => artifact.createdAt.getTime()),
    );
    const isAnalysisCompletedSince = artifacts.some(
      (artifact) =>
        artifact.artifactType === ARTIFACT_TYPES.legacyAnalysis &&
        artifact.createdAt.getTime() >= earliest,
    );
    if (isAnalysisCompletedSince) return null;

    const run = await this.promptRuns.findById(runId);
    const isSameStage =
      run !== null &&
      run.workspaceId === workspace.id &&
      run.promptStep === prepared.stage.key &&
      run.inputHash === prepared.identity;
    if (!run || !isSameStage) return null;

    const texts = new Map<string, string>();
    for (const artifact of stageArtifacts) {
      const text = await this.artifactStorage.readFileIfExists(
        path.join(context.workspaceAbsPath, artifact.canonicalFileName),
      );
      if (text === null || sha256(text) !== artifact.contentHash) return null;
      texts.set(artifact.artifactType, text);
    }

    const accepted = this.revalidateReused(prepared, context, outputs, texts);
    if (!accepted) return null;
    this.logger.log(
      `Reusing verified stage ${prepared.stage.key} of workspace "${workspace.id}" (run ${run.id})`,
    );
    return { run, accepted, texts };
  }

  // Identity and file hash already match; the content is checked once more with the same rules
  // that accepted it, so a stage is never reused on data the runner would reject now.
  private revalidateReused(
    prepared: PreparedStage,
    context: RunContext,
    outputs: StageOutputs,
    texts: ReadonlyMap<string, string>,
  ): AcceptedAnswer | null {
    const parsed = (type: string): unknown => {
      const json = parseStageJson(texts.get(type) ?? '');
      return json.success ? json.data : null;
    };
    const { stage } = prepared;
    let requirements = outputs.requirements;
    if (stage.producesRequirements) {
      const validated = validateVacancyRequirements(
        parsed(ARTIFACT_TYPES.requirements),
        context.vacancyText,
      );
      if (!validated.success) return null;
      requirements = validated.data;
    }
    if (!requirements) return null;
    if (!stage.producesAssessment) {
      return {
        requirements,
        assessment: null,
        decision: null,
        projected: null,
      };
    }
    const stored = validateAnalysisDecision(parsed(ARTIFACT_TYPES.decision));
    if (!stored.success) return null;
    const decided = this.decide(
      prepared,
      context,
      requirements,
      parsed(ARTIFACT_TYPES.assessment),
      stored.data.advisory_decision,
    );
    return decided.success ? decided.data : null;
  }

  // ---------- one paid stage ----------

  private async executeStage(
    prepared: PreparedStage,
    run: PromptRun,
    context: RunContext,
    outputs: StageOutputs,
    aiRunTracker: AiRunTracker,
  ): Promise<StageOutcome> {
    const { stage, request } = prepared;
    const summary: StageRunSummary = {
      key: stage.key,
      promptRunId: run.id,
      aiRunId: null,
      reused: false,
    };
    await this.promptRuns.markRunning(run.id);
    if (stage.isCandidateAware && context.manualNotes.length > 0) {
      await this.prisma.manualNoteApplication.createMany({
        data: context.manualNotes.map((note) => ({
          manualNoteId: note.id,
          promptRunId: run.id,
        })),
      });
    }

    const requestHash = requestHashOf(request);
    const model = {
      provider: this.aiProvider.providerName,
      model: this.aiProvider.modelName,
    };
    let rawText: string;
    let usage: Awaited<ReturnType<AiProvider['complete']>>['usage'];
    try {
      const result = await this.aiProvider.complete(
        request.prompt,
        request.inputContext,
        { jsonMode: true, step: stage.key },
      );
      rawText = result.text;
      usage = result.usage;
    } catch (providerError) {
      const aiRun = await this.aiRuns.saveFailed({
        ...model,
        requestHash,
        errorMessage: errorMessageOf(providerError),
      });
      aiRunTracker.id = aiRun.id;
      summary.aiRunId = aiRun.id;
      await this.promptRuns.fail(run.id, aiRun.id);
      return {
        status: 'failed',
        summary,
        reason: failureDetail(providerError),
      };
    }

    const responseHash = sha256(rawText);
    const accepted = this.acceptAnswer(prepared, rawText, context, outputs);
    if (!accepted.success) {
      const reason = `the answer failed validation: ${accepted.errors.join('; ')}`;
      const aiRun = await this.aiRuns.saveFailed({
        ...model,
        requestHash,
        responseHash,
        errorMessage: `${stage.key} ${reason}`,
      });
      aiRunTracker.id = aiRun.id;
      summary.aiRunId = aiRun.id;
      await this.promptRuns.fail(run.id, aiRun.id);
      return { status: 'failed', summary, reason };
    }

    // The AiRun is saved before any file is written or artifact registered (ISSUE-543).
    const aiRun = await this.aiRuns.saveSuccess({
      ...model,
      requestHash,
      responseHash,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
      cachedInputTokens: usage?.cachedInputTokens,
      reasoningTokens: usage?.reasoningTokens,
      usageRawJson: usage?.rawJson,
    });
    aiRunTracker.id = aiRun.id;
    summary.aiRunId = aiRun.id;

    const texts = new Map<string, string>();
    const registered: GeneratedArtifact[] = [];
    if (stage.producesRequirements) {
      const text = JSON.stringify(accepted.data.requirements, null, 2);
      texts.set(ARTIFACT_TYPES.requirements, text);
      registered.push(
        await this.writeArtifact(
          context,
          run.id,
          ARTIFACT_TYPES.requirements,
          VACANCY_REQUIREMENTS_ARTIFACT,
          text,
          stage.key,
        ),
      );
    }
    if (stage.producesAssessment) {
      const assessmentText = JSON.stringify(accepted.data.assessment, null, 2);
      const decisionText = JSON.stringify(accepted.data.decision, null, 2);
      texts.set(ARTIFACT_TYPES.assessment, assessmentText);
      texts.set(ARTIFACT_TYPES.decision, decisionText);
      registered.push(
        await this.writeArtifact(
          context,
          run.id,
          ARTIFACT_TYPES.assessment,
          FIT_ASSESSMENT_ARTIFACT,
          assessmentText,
          stage.key,
        ),
        await this.writeArtifact(
          context,
          run.id,
          ARTIFACT_TYPES.decision,
          ANALYSIS_DECISION_ARTIFACT,
          decisionText,
          stage.key,
        ),
      );
    }
    this.acceptOutputs(stage, accepted.data, texts, outputs);
    outputs.finalRunId = run.id;
    return {
      status: 'completed',
      summary,
      openRun: {
        id: run.id,
        aiRunId: aiRun.id,
        outputArtifactIds: registered.map((artifact) => artifact.id),
      },
    };
  }

  // The stage answer is accepted only when the envelope, the T1 validators and — for a stage
  // that writes `01b` — the policy (row V) and the legacy projection all accept it (INV-15).
  private acceptAnswer(
    prepared: PreparedStage,
    rawText: string,
    context: RunContext,
    outputs: StageOutputs,
  ): ContractValidation<AcceptedAnswer> {
    const { stage } = prepared;
    const json = parseStageJson(rawText);
    if (!json.success) return json;

    if (!stage.producesAssessment) {
      const answer = parseRequirementsAnswer(json.data);
      if (!answer.success) return answer;
      const requirements = validateVacancyRequirements(
        answer.data,
        context.vacancyText,
      );
      if (!requirements.success) return requirements;
      return {
        success: true,
        data: {
          requirements: requirements.data,
          assessment: null,
          decision: null,
          projected: null,
        },
      };
    }

    const answer = parseAssessmentAnswer(stage, json.data);
    if (!answer.success) return answer;
    let requirements: VacancyRequirements;
    if (stage.producesRequirements) {
      const validated = validateVacancyRequirements(
        answer.data.requirements,
        context.vacancyText,
      );
      if (!validated.success) return validated;
      requirements = validated.data;
    } else {
      requirements = outputs.requirements as VacancyRequirements;
    }
    return this.decide(
      prepared,
      context,
      requirements,
      recordSnapshotId(answer.data.assessment, prepared.snapshotId as string),
      answer.data.advisoryDecision,
    );
  }

  private decide(
    prepared: PreparedStage,
    context: RunContext,
    requirements: VacancyRequirements,
    assessmentRaw: unknown,
    advisoryDecision: AnalysisDecision['advisory_decision'],
  ): ContractValidation<AcceptedAnswer> {
    const catalog = prepared.catalog as EvidenceCatalog;
    const assessment = validateFitAssessment(assessmentRaw, {
      requirements,
      catalog,
    });
    if (!assessment.success) return assessment;
    try {
      const decision = runDecisionPolicy(
        {
          vacancyText: context.vacancyText,
          requirements,
          assessment: assessment.data,
          catalog,
        },
        advisoryDecision,
      );
      const { company, jobVacancy } = context.workspace;
      const projected = projectToLegacyVacancyAnalysis({
        workspace: {
          company_name_original: company.nameOriginal,
          company_slug: company.companySlug,
          role_title_original: jobVacancy.roleTitleOriginal,
          role_slug: jobVacancy.roleSlug,
        },
        requirements,
        assessment: assessment.data,
        decision,
      });
      return {
        success: true,
        data: {
          requirements,
          assessment: assessment.data,
          decision,
          projected,
        },
      };
    } catch (error) {
      if (
        error instanceof DecisionPolicyInputError ||
        error instanceof LegacyProjectionError
      ) {
        return { success: false, errors: [error.message] };
      }
      throw error;
    }
  }

  private acceptOutputs(
    stage: AnalysisStage,
    accepted: AcceptedAnswer,
    texts: ReadonlyMap<string, string>,
    outputs: StageOutputs,
  ): void {
    if (stage.producesRequirements) {
      outputs.requirements = accepted.requirements;
      outputs.requirementsText = texts.get(ARTIFACT_TYPES.requirements) ?? null;
    }
    if (stage.producesAssessment) {
      outputs.assessment = accepted.assessment;
      outputs.decision = accepted.decision;
      outputs.projected = accepted.projected;
    }
  }

  // ---------- after the last stage ----------

  private async completeAnalysis(
    context: RunContext,
    outputs: StageOutputs,
    summaries: StageRunSummary[],
  ): Promise<ExperimentalAnalysisResult> {
    const { workspace } = context;
    const decision = outputs.decision as AnalysisDecision;
    const projected = outputs.projected as VacancyAnalysis;
    const runId = outputs.finalRunId as string;
    const lastStage = summaries[summaries.length - 1].key;

    await this.writeArtifact(
      context,
      runId,
      ARTIFACT_TYPES.legacyAnalysis,
      LEGACY_ANALYSIS_FILE,
      JSON.stringify(projected, null, 2),
      lastStage,
    );

    const policyDecision = decisionToEnum(decision.decision);
    await this.workspaceStatus.transition(
      workspace.id,
      WorkspaceStatus.analysis_running,
      WorkspaceStatus.paused_after_analysis,
      {
        data: {
          currentDecision: policyDecision,
          // The policy result, written once by the analysis (ADR-046 item 4).
          originalDecision: policyDecision,
          score: decision.score,
          nextRecommendedAction: projected.recommended_next_action,
        },
      },
    );
    return {
      success: true,
      workspaceStatus: WorkspaceStatus.paused_after_analysis,
      stages: summaries,
      decision: policyDecision,
      score: decision.score,
    };
  }

  private async writeArtifact(
    context: RunContext,
    promptRunId: string,
    artifactType: string,
    canonicalFileName: string,
    content: string,
    origin: string,
  ): Promise<GeneratedArtifact> {
    const { filePath, hash } = await this.artifactStorage.writeFile(
      context.workspaceAbsPath,
      canonicalFileName,
      content,
    );
    return this.artifactsService.register({
      workspaceId: context.workspace.id,
      promptRunId,
      artifactType,
      canonicalFileName,
      filePath,
      storageRoot: context.workspace.storageRoot,
      contentHash: hash,
      origin,
      mimeType: JSON_MIME_TYPE,
    });
  }

  // Back to the entry status with a reason naming the stage (INV-11). Only while the workspace is
  // still analysis_running, and it never throws: cleanup must not mask the stage's own error.
  private async rollback(
    workspaceId: string,
    stage: AnalysisStageKey,
    reason: string,
  ): Promise<WorkspaceStatus> {
    try {
      await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.analysis_running,
        ANALYSIS_ENTRY_STATUS,
      );
      await this.stepFailure.record(
        workspaceId,
        ANALYSIS_STEP,
        `${stage}: ${reason}`,
      );
      return ANALYSIS_ENTRY_STATUS;
    } catch (cleanupError) {
      this.logger.warn(
        `Could not roll back analysis of workspace "${workspaceId}": ${errorMessageOf(cleanupError)}`,
      );
      return WorkspaceStatus.analysis_running;
    }
  }
}
