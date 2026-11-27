import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AiRun,
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  Prisma,
  PromptRun,
  VacancyDecision,
  WorkspaceStatus,
} from '@prisma/client';
import { CostEstimate, estimateCost, PricedCall } from '../ai/pricing';
import {
  UsageBreakdown,
  sumUsageBreakdowns,
  toUsageBreakdown,
} from '../ai/usage-breakdown';
import {
  ArtifactWithSlugs,
  ArtifactsService,
} from '../artifacts/artifacts.service';
import { parseSnapshotSources } from '../knowledge-sources/source-snapshot-comparison';
import { ANALYSIS_STAGE_KEYS } from '../pipeline/analysis/analysis-stages';
import {
  ARTIFACT_TYPES,
  CARRIED_OVER_ORIGIN,
} from '../pipeline/analysis/experimental-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiStepsService } from '../queue/ai-steps.service';
import {
  WorkspaceAnalysisPolicy,
  WorkspacesService,
} from './workspaces.service';

// The read-only comparison summary of a fork group (ADR-046 items 8 and 11, ISSUE-716): one row per
// workspace of the group, the source included. Token usage comes only from the provider-neutral
// breakdown and every cost only from the pricing table of `src/ai/`, labelled as an estimate.
// Input equality compares what each member's latest analysis actually recorded, never the
// currently active sources.

const LEGACY_ANALYSIS_STEP = 'prompt_1';
// The analysis steps in report order: the legacy Prompt 1, then the experimental stages.
const ANALYSIS_STEP_KEYS: readonly string[] = [
  LEGACY_ANALYSIS_STEP,
  'analysis_b',
  ...ANALYSIS_STAGE_KEYS.filter((key) => key !== 'analysis_b'),
];
const COMPLETED_AI_RUN_STATUS = 'completed';
const NO_ACTIVE_JOB = 'none';
const UNKNOWN_JOB_STATE = 'unknown';

export interface ComparisonActiveJob {
  // a BullMQ state of the open job, `none` without one, `unknown` when the queue cannot be read
  state: string;
  jobId: string | null;
  step: string | null;
}

export interface ComparisonStepError {
  step: string;
  message: string | null;
  at: Date | null;
}

export interface ComparisonStage {
  stepKey: string;
  // the stage's `01a` was carried over from the fork's source: no call of this workspace made it
  isCarriedOver: boolean;
  carriedOverFromWorkspaceId: string | null;
  promptRunCount: number;
  callCount: number;
  failedCallCount: number;
  unmeasuredCallCount: number;
  durationMs: number;
  models: string[];
  usage: UsageBreakdown;
  estimate: CostEstimate;
}

export interface ComparisonTotals {
  callCount: number;
  failedCallCount: number;
  unmeasuredCallCount: number;
  durationMs: number;
  usage: UsageBreakdown;
  estimate: CostEstimate;
}

export interface ComparisonMember {
  workspaceId: string;
  workspaceSlug: string;
  isRequested: boolean;
  isGroupRoot: boolean;
  forkedFromWorkspaceId: string | null;
  analysisStrategy: AnalysisStrategy;
  contextLayout: ContextLayout;
  contextSourceSet: ContextSourceSet;
  carryOverRequirements: boolean;
  status: WorkspaceStatus;
  isArchived: boolean;
  activeJob: ComparisonActiveJob;
  lastStepError: ComparisonStepError | null;
  currentDecision: VacancyDecision | null;
  originalDecision: VacancyDecision | null;
  score: number | null;
  analysisPolicy: WorkspaceAnalysisPolicy | null;
  stages: ComparisonStage[];
  totals: ComparisonTotals;
}

export interface InputEqualityFlag {
  // false when two recorded values differ
  isEqual: boolean;
  // members whose value is not recorded (no completed analysis, or an unreadable record)
  unrecordedWorkspaceIds: string[];
}

export interface ComparisonInputEquality {
  vacancyHash: InputEqualityFlag;
  companyAndRole: InputEqualityFlag;
  notes: InputEqualityFlag;
  snapshot: InputEqualityFlag;
  model: InputEqualityFlag;
}

export interface ComparisonSummary {
  workspaceId: string;
  comparisonGroupId: string | null;
  members: ComparisonMember[];
  inputEquality: ComparisonInputEquality;
}

type MemberWorkspace = Prisma.ApplicationWorkspaceGetPayload<{
  include: { company: true; jobVacancy: true };
}>;

type RunWithAiRun = PromptRun & { aiRun: AiRun | null };

// The recorded inputs of one member; null = not recorded.
interface MemberInputs {
  workspaceId: string;
  vacancyHash: string;
  companyAndRole: string;
  notes: string;
  snapshot: string | null;
  model: string | null;
}

const latestOf = (
  artifacts: readonly ArtifactWithSlugs[],
  artifactType: string,
): ArtifactWithSlugs | undefined =>
  artifacts.find(
    (artifact) => artifact.artifactType === artifactType && artifact.isLatest,
  );

const modelOf = (aiRun: AiRun): string => `${aiRun.provider}/${aiRun.model}`;

const durationOf = (run: RunWithAiRun): number =>
  run.aiRun
    ? Math.max(0, run.aiRun.createdAt.getTime() - run.createdAt.getTime())
    : 0;

// The source ids and hashes a run recorded, one text per source; null when it cannot be read.
// Prompt 1 records the entry list itself, the X1 / X2 / B stages an object around it.
const snapshotEntriesOf = (sourceSnapshot: string | null): string[] | null => {
  if (sourceSnapshot === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(sourceSnapshot);
  } catch {
    return null;
  }
  const wrapped = Array.isArray(parsed)
    ? JSON.stringify({ knowledgeSources: parsed })
    : sourceSnapshot;
  const sources = parseSnapshotSources(wrapped);
  if (sources === null) return null;
  return sources.map(
    (source) => `${source.sourceType}\n${source.id}\n${source.contentHash}`,
  );
};

// The sources of every run that produced the analysis (for C also the X1 run, which reads the
// `cv_rules` excerpt), in one canonical text; null when any of them cannot be read.
const snapshotKeyOf = (runs: readonly RunWithAiRun[]): string | null => {
  const entries = new Set<string>();
  for (const run of runs) {
    const runEntries = snapshotEntriesOf(run.sourceSnapshot);
    if (runEntries === null) return null;
    for (const entry of runEntries) entries.add(entry);
  }
  return JSON.stringify([...entries].sort());
};

const flagOf = (
  inputs: readonly MemberInputs[],
  valueOf: (input: MemberInputs) => string | null,
): InputEqualityFlag => {
  const recorded = new Set<string>();
  const unrecordedWorkspaceIds: string[] = [];
  for (const input of inputs) {
    const value = valueOf(input);
    if (value === null) unrecordedWorkspaceIds.push(input.workspaceId);
    else recorded.add(value);
  }
  return { isEqual: recorded.size <= 1, unrecordedWorkspaceIds };
};

const pricedCallsOf = (runs: readonly RunWithAiRun[]): PricedCall[] =>
  runs.flatMap((run) =>
    run.aiRun
      ? [
          {
            provider: run.aiRun.provider,
            model: run.aiRun.model,
            usage: toUsageBreakdown(run.aiRun.provider, run.aiRun.usageRawJson),
          },
        ]
      : [],
  );

const totalsOf = (runs: readonly RunWithAiRun[]): ComparisonTotals => {
  const calls = pricedCallsOf(runs);
  const usages = calls.map((call) => call.usage);
  return {
    callCount: calls.length,
    failedCallCount: runs.filter(
      (run) => run.aiRun && run.aiRun.status !== COMPLETED_AI_RUN_STATUS,
    ).length,
    unmeasuredCallCount: usages.filter((usage) => !usage.isMeasured).length,
    durationMs: runs.reduce((sum, run) => sum + durationOf(run), 0),
    usage: sumUsageBreakdowns(usages),
    estimate: estimateCost(calls),
  };
};

@Injectable()
export class ComparisonSummaryService {
  private readonly logger = new Logger(ComparisonSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactsService: ArtifactsService,
    private readonly workspacesService: WorkspacesService,
    private readonly aiStepsService: AiStepsService,
  ) {}

  async buildSummary(workspaceId: string): Promise<ComparisonSummary> {
    const requested = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });
    if (!requested) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }
    const groupId = requested.comparisonGroupId;
    const workspaces =
      groupId === null
        ? [requested]
        : await this.prisma.applicationWorkspace.findMany({
            where: { OR: [{ comparisonGroupId: groupId }, { id: groupId }] },
            include: { company: true, jobVacancy: true },
            orderBy: { createdAt: 'asc' },
          });

    const members: ComparisonMember[] = [];
    const inputs: MemberInputs[] = [];
    for (const workspace of workspaces) {
      const built = await this.buildMember(workspace, workspaceId, groupId);
      members.push(built.member);
      inputs.push(built.inputs);
    }
    return {
      workspaceId,
      comparisonGroupId: groupId,
      members,
      inputEquality: {
        vacancyHash: flagOf(inputs, (input) => input.vacancyHash),
        companyAndRole: flagOf(inputs, (input) => input.companyAndRole),
        notes: flagOf(inputs, (input) => input.notes),
        snapshot: flagOf(inputs, (input) => input.snapshot),
        model: flagOf(inputs, (input) => input.model),
      },
    };
  }

  private async buildMember(
    workspace: MemberWorkspace,
    requestedId: string,
    groupId: string | null,
  ): Promise<{ member: ComparisonMember; inputs: MemberInputs }> {
    const runs: RunWithAiRun[] = await this.prisma.promptRun.findMany({
      where: {
        workspaceId: workspace.id,
        promptStep: { in: [...ANALYSIS_STEP_KEYS] },
      },
      include: { aiRun: true },
      orderBy: { createdAt: 'asc' },
    });
    const artifacts = await this.artifactsService.findByWorkspaceId(
      workspace.id,
    );
    const carried = await this.findCarriedRequirements(workspace, artifacts);
    const analysisPolicy = await this.workspacesService.findAnalysisPolicy(
      workspace,
      artifacts,
    );

    const member: ComparisonMember = {
      workspaceId: workspace.id,
      workspaceSlug: workspace.workspaceSlug,
      isRequested: workspace.id === requestedId,
      isGroupRoot: groupId !== null && workspace.id === groupId,
      forkedFromWorkspaceId: workspace.forkedFromWorkspaceId,
      analysisStrategy: workspace.analysisStrategy,
      contextLayout: workspace.contextLayout,
      contextSourceSet: workspace.contextSourceSet,
      carryOverRequirements: artifacts.some(
        (artifact) =>
          artifact.artifactType === ARTIFACT_TYPES.requirements &&
          artifact.origin === CARRIED_OVER_ORIGIN,
      ),
      status: workspace.status,
      isArchived: workspace.isArchived,
      activeJob: await this.findActiveJobSafely(workspace.id),
      lastStepError: workspace.lastStepErrorStep
        ? {
            step: workspace.lastStepErrorStep,
            message: workspace.lastStepErrorMessage,
            at: workspace.lastStepErrorAt,
          }
        : null,
      currentDecision: workspace.currentDecision,
      originalDecision: workspace.originalDecision,
      score: workspace.score,
      analysisPolicy,
      stages: this.stagesOf(runs, carried),
      totals: totalsOf(runs),
    };
    const inputs = await this.recordedInputsOf(workspace, artifacts, carried);
    return { member, inputs };
  }

  // The fork's latest `01a` when it is the carried-over copy: its run is the source's X1 run.
  private async findCarriedRequirements(
    workspace: MemberWorkspace,
    artifacts: readonly ArtifactWithSlugs[],
  ): Promise<RunWithAiRun | null> {
    const requirements = latestOf(artifacts, ARTIFACT_TYPES.requirements);
    if (requirements?.origin !== CARRIED_OVER_ORIGIN) return null;
    if (!requirements.promptRunId) return null;
    const run = await this.prisma.promptRun.findUnique({
      where: { id: requirements.promptRunId },
      include: { aiRun: true },
    });
    if (!run || run.workspaceId !== workspace.forkedFromWorkspaceId) {
      return null;
    }
    return run;
  }

  // One row per analysis step the member ran, plus the carried-over X1 of a fork. A carried
  // stage counts no call, no usage and no estimate here: the source's row already holds them.
  private stagesOf(
    runs: readonly RunWithAiRun[],
    carried: RunWithAiRun | null,
  ): ComparisonStage[] {
    const stages: ComparisonStage[] = [];
    for (const stepKey of ANALYSIS_STEP_KEYS) {
      const stepRuns = runs.filter((run) => run.promptStep === stepKey);
      // Carried over only while the fork made no call of its own for the stage: a carried `01a` the
      // runner did not reuse (its identity no longer matched) leaves a row of real calls.
      const isCarriedOver =
        carried?.promptStep === stepKey && stepRuns.length === 0;
      if (stepRuns.length === 0 && !isCarriedOver) continue;
      const totals = totalsOf(stepRuns);
      const models = new Set(
        stepRuns.flatMap((run) => (run.aiRun ? [modelOf(run.aiRun)] : [])),
      );
      stages.push({
        stepKey,
        isCarriedOver,
        carriedOverFromWorkspaceId: isCarriedOver
          ? (carried as RunWithAiRun).workspaceId
          : null,
        promptRunCount: stepRuns.length,
        callCount: totals.callCount,
        failedCallCount: totals.failedCallCount,
        unmeasuredCallCount: totals.unmeasuredCallCount,
        durationMs: totals.durationMs,
        models: [...models].sort(),
        usage: totals.usage,
        estimate: totals.estimate,
      });
    }
    return stages;
  }

  // What the member's latest analysis read. Vacancy, company and role, and notes are always
  // recorded; snapshot and model exist only for a completed analysis (its latest `01` and, for
  // C, the run of its `01a`, which can be the source's X1 run of a carried-over `01a`).
  private async recordedInputsOf(
    workspace: MemberWorkspace,
    artifacts: readonly ArtifactWithSlugs[],
    carried: RunWithAiRun | null,
  ): Promise<MemberInputs> {
    const inputs: MemberInputs = {
      workspaceId: workspace.id,
      vacancyHash: workspace.jobVacancy.vacancyTextHash,
      companyAndRole: JSON.stringify([
        workspace.company.nameOriginal,
        workspace.company.companySlug,
        workspace.jobVacancy.roleTitleOriginal,
        workspace.jobVacancy.roleSlug,
      ]),
      notes: '',
      snapshot: null,
      model: null,
    };
    const notes = await this.prisma.manualNote.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'asc' },
      include: { applications: { select: { promptRunId: true } } },
    });

    const analysisRun = await this.findOwnRun(
      workspace,
      latestOf(artifacts, ARTIFACT_TYPES.legacyAnalysis)?.promptRunId,
    );
    if (!analysisRun) {
      inputs.notes = JSON.stringify(notes.map((note) => note.text));
      return inputs;
    }
    inputs.notes = JSON.stringify(
      notes
        .filter((note) =>
          note.applications.some((item) => item.promptRunId === analysisRun.id),
        )
        .map((note) => note.text),
    );
    const requirementsRunId = latestOf(
      artifacts,
      ARTIFACT_TYPES.requirements,
    )?.promptRunId;
    const requirementsRun =
      carried ?? (await this.findOwnRun(workspace, requirementsRunId));
    const producingRuns = [analysisRun, requirementsRun].filter(
      (run): run is RunWithAiRun => run !== null,
    );
    inputs.snapshot = snapshotKeyOf(producingRuns);
    const hasEveryModel = producingRuns.every((run) => run.aiRun !== null);
    inputs.model = hasEveryModel
      ? JSON.stringify(
          [
            ...new Set(producingRuns.map((run) => modelOf(run.aiRun as AiRun))),
          ].sort(),
        )
      : null;
    if (inputs.snapshot === null) {
      this.logger.warn(
        `Workspace "${workspace.id}": the source snapshot of a run of its analysis cannot be read`,
      );
    }
    return inputs;
  }

  private async findOwnRun(
    workspace: MemberWorkspace,
    runId: string | null | undefined,
  ): Promise<RunWithAiRun | null> {
    if (!runId) return null;
    const run = await this.prisma.promptRun.findUnique({
      where: { id: runId },
      include: { aiRun: true },
    });
    return run && run.workspaceId === workspace.id ? run : null;
  }

  // As the workspace detail: a queue that cannot be read means the job state is unknown, and the
  // summary is still returned.
  private async findActiveJobSafely(
    workspaceId: string,
  ): Promise<ComparisonActiveJob> {
    try {
      const job = await this.aiStepsService.findActiveJob(workspaceId);
      return job
        ? { state: job.state, jobId: job.jobId, step: job.step }
        : { state: NO_ACTIVE_JOB, jobId: null, step: null };
    } catch (error) {
      this.logger.warn(
        `Could not read the active background job of workspace "${workspaceId}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { state: UNKNOWN_JOB_STATE, jobId: null, step: null };
    }
  }
}
