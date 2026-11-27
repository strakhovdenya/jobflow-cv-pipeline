import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationWorkspace,
  ManualNote,
  Prisma,
  WorkspaceStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import {
  ArtifactWithSlugs,
  ArtifactsService,
} from '../artifacts/artifacts.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
import { KnowledgeSourcesService } from '../knowledge-sources/knowledge-sources.service';
import {
  findPinnedSnapshot,
  findSourceMismatches,
} from '../knowledge-sources/source-snapshot-comparison';
import { ARTIFACT_TYPES } from '../pipeline/analysis/experimental-analysis.service';
import {
  AnalysisDecision,
  OpenQuestion,
  validateAnalysisDecision,
} from '../pipeline/structured-analysis/analysis-decision.schema';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

export interface WorkspaceCreationResult {
  id: string;
  status: WorkspaceStatus;
  companySlug: string;
  roleSlug: string;
  workspaceSlug: string;
  folderPath: string;
  vacancySourcePath: string;
  vacancyTextHash: string;
  companyId: string;
  jobVacancyId: string;
  createdAt: Date;
}

export interface WorkspaceArtifactSummary {
  id: string;
  artifactType: string;
  canonicalFileName: string;
  downloadFileName: string | null;
  isLatest: boolean;
  version: number;
  mimeType: string | null;
  fileSizeBytes: number | null;
  createdAt: Date;
}

export interface WorkspaceManualNoteApplicationSummary {
  promptStep: string;
  stepDetail: string | null;
  appliedAt: Date;
}

export interface WorkspaceManualNoteSummary {
  id: string;
  text: string;
  isLegacy: boolean;
  createdAt: Date;
  applications: WorkspaceManualNoteApplicationSummary[];
}

// ADR-034: one entry per manual-note-forced claim found in this workspace's latest pipeline
// artifacts, surfaced to a human before export/send — see getWorkspaceDetail's aggregation.
export interface WorkspaceManualNoteForcedClaimSummary {
  step: 'prompt_1' | 'prompt_2' | 'skip_reason' | 'cover_letter';
  location: string;
  text: string;
}

// ADR-034: an artifact that exists but could not be parsed — its forced claims (if any) are
// unknown, so a human must be told instead of seeing a silently shorter list.
export interface WorkspaceManualNoteForcedClaimsUnreadableSummary {
  step: WorkspaceManualNoteForcedClaimSummary['step'];
  fileName: string;
}

// ADR-046 items 4 and 5 (ISSUE-716): the policy result of the latest experimental analysis, read
// from its `01c`. The policy decides; the model's decision is advisory.
export interface WorkspaceAnalysisPolicy {
  decision: AnalysisDecision['decision'];
  score: number;
  advisoryDecision: AnalysisDecision['advisory_decision'];
  advisoryDiffers: boolean;
  borderline: boolean;
  borderlineReasons: string[];
  manualReviewRequired: boolean;
  decidingRule: AnalysisDecision['deciding_rule'];
  openQuestions: OpenQuestion[];
  policyVersion: string;
}

export type WorkspaceWithRelations = Prisma.ApplicationWorkspaceGetPayload<{
  include: { company: true; jobVacancy: true };
}>;

export type WorkspaceDetailResult = WorkspaceWithRelations & {
  artifacts: WorkspaceArtifactSummary[];
  manualNotes: WorkspaceManualNoteSummary[];
  manualNoteForcedClaims: WorkspaceManualNoteForcedClaimSummary[];
  manualNoteForcedClaimsUnreadable: WorkspaceManualNoteForcedClaimsUnreadableSummary[];
  // ADR-046 item 13: the active sources differ from the ones the analysis was pinned to
  sourcesChangedSinceAnalysis: boolean;
  // present only when the latest analysis wrote a readable, valid `01c`
  analysisPolicy?: WorkspaceAnalysisPolicy;
};

interface ParsedForcedClaims {
  entries: { location: string; text: string }[];
  skippedCount: number;
}

// null means the artifact is not a JSON object at all (corrupt); a valid object without the
// field simply carries no forced claims.
const parseForcedClaims = (raw: string): ParsedForcedClaims | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const rawEntries = (parsed as Record<string, unknown>)
    .manual_note_forced_claims;
  if (rawEntries === undefined) {
    return { entries: [], skippedCount: 0 };
  }
  if (!Array.isArray(rawEntries)) {
    return null;
  }

  const entries: ParsedForcedClaims['entries'] = [];
  for (const entry of rawEntries as unknown[]) {
    const { location, text } = (entry ?? {}) as Record<string, unknown>;
    if (typeof location === 'string' && typeof text === 'string') {
      entries.push({ location, text });
    }
  }
  return { entries, skippedCount: rawEntries.length - entries.length };
};

// Canonical JSON filenames per pipeline step (root CLAUDE.md Artifact Rules) — the only files
// that can carry a manual_note_forced_claims array (ADR-034).
const FORCED_CLAIMS_ARTIFACTS: {
  step: WorkspaceManualNoteForcedClaimSummary['step'];
  fileName: string;
}[] = [
  { step: 'prompt_1', fileName: '01_vacancy_analysis.json' },
  { step: 'prompt_2', fileName: '02_targeted_cv_content.json' },
  { step: 'skip_reason', fileName: '01_skip_reason.json' },
  { step: 'cover_letter', fileName: 'cover_letter.json' },
];

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
    private readonly companyService: CompanyService,
    private readonly vacancyService: VacancyService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    private readonly knowledgeSources: KnowledgeSourcesService,
  ) {}

  async createWorkspace(
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceCreationResult> {
    const companySlug = this.slugService.normalizeCompanySlug(
      dto.companyNameOriginal,
    );
    const roleSlug = this.slugService.normalizeRoleSlug(dto.roleTitleOriginal);
    const workspaceSlug = `${this.formatDate(new Date())}_${companySlug}_${roleSlug}`;

    // The folder of an existing workspace must be neither overwritten nor cleaned up (ADR-039).
    const folder =
      await this.artifactStorage.createWorkspaceFolderExclusive(workspaceSlug);
    if (!folder) {
      throw this.buildSlugConflict(dto, workspaceSlug);
    }
    const { absolutePath, relativePath } = folder;

    const { filePath: vacancyFilePath, hash: vacancyTextHash } =
      await this.artifactStorage.saveVacancySource(
        absolutePath,
        dto.vacancyText,
      );

    let company: Awaited<ReturnType<CompanyService['create']>>;
    let vacancy: Awaited<ReturnType<VacancyService['create']>>;
    let workspace: ApplicationWorkspace;
    try {
      ({ company, vacancy, workspace } = await this.prisma.$transaction(
        async (tx) => {
          const txCompany = await this.companyService.create(
            { nameOriginal: dto.companyNameOriginal, companySlug },
            tx,
          );

          const txVacancy = await this.vacancyService.create(
            {
              roleTitleOriginal: dto.roleTitleOriginal,
              roleSlug,
              sourceUrl: dto.sourceUrl ?? null,
              vacancyTextPath: vacancyFilePath,
              vacancyTextHash,
              company: { connect: { id: txCompany.id } },
            },
            tx,
          );

          const txWorkspace = await tx.applicationWorkspace.create({
            data: {
              workspaceSlug,
              storageRoot: this.artifactStorage.storageRoot,
              workspacePath: relativePath,
              status: WorkspaceStatus.source_saved,
              createdFrom: 'manual',
              company: { connect: { id: txCompany.id } },
              jobVacancy: { connect: { id: txVacancy.id } },
            },
          });

          await this.artifactsService.register(
            {
              workspaceId: txWorkspace.id,
              artifactType: 'vacancy_source',
              canonicalFileName: '00_vacancy_source.txt',
              filePath: vacancyFilePath,
              storageRoot: this.artifactStorage.storageRoot,
              contentHash: vacancyTextHash,
              origin: 'pasted',
              mimeType: 'text/plain',
            },
            tx,
          );

          return {
            company: txCompany,
            vacancy: txVacancy,
            workspace: txWorkspace,
          };
        },
      ));
    } catch (error) {
      const failure =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        String(error.meta?.target).includes('workspaceSlug')
          ? this.buildSlugConflict(dto, workspaceSlug)
          : error;

      await this.discardWorkspaceFolder(absolutePath);
      throw failure;
    }

    return {
      id: workspace.id,
      status: workspace.status,
      companySlug,
      roleSlug,
      workspaceSlug,
      folderPath: relativePath,
      vacancySourcePath: `${relativePath}/00_vacancy_source.txt`,
      vacancyTextHash,
      companyId: company.id,
      jobVacancyId: vacancy.id,
      createdAt: workspace.createdAt,
    };
  }

  async findAll(): Promise<WorkspaceWithRelations[]> {
    return this.prisma.applicationWorkspace.findMany({
      include: { company: true, jobVacancy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<WorkspaceWithRelations | null> {
    return this.prisma.applicationWorkspace.findUnique({
      where: { id },
      include: { company: true, jobVacancy: true },
    });
  }

  async getWorkspaceDetail(id: string): Promise<WorkspaceDetailResult | null> {
    const workspace = await this.findById(id);
    if (!workspace) {
      return null;
    }

    const artifacts = await this.artifactsService.findByWorkspaceId(id);
    const manualNotes = await this.prisma.manualNote.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        applications: {
          include: { promptRun: { select: { promptStep: true } } },
          orderBy: { appliedAt: 'asc' },
        },
      },
    });
    const { claims, unreadable } = await this.readManualNoteForcedClaims(
      workspace.storageRoot,
      workspace.workspacePath,
    );
    const sourcesChangedSinceAnalysis =
      await this.isSourcesChangedSinceAnalysis(workspace);
    const analysisPolicy = await this.findAnalysisPolicy(workspace, artifacts);

    return {
      ...workspace,
      ...(analysisPolicy ? { analysisPolicy } : {}),
      manualNoteForcedClaims: claims,
      manualNoteForcedClaimsUnreadable: unreadable,
      sourcesChangedSinceAnalysis,
      artifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        artifactType: artifact.artifactType,
        canonicalFileName: artifact.canonicalFileName,
        downloadFileName: artifact.downloadFileName,
        isLatest: artifact.isLatest,
        version: artifact.version,
        mimeType: artifact.mimeType,
        fileSizeBytes: artifact.fileSizeBytes,
        createdAt: artifact.createdAt,
      })),
      manualNotes: manualNotes.map((note) => ({
        id: note.id,
        text: note.text,
        isLegacy: note.isLegacy,
        createdAt: note.createdAt,
        applications: note.applications.map((app) => ({
          promptStep: app.promptRun.promptStep,
          stepDetail: app.stepDetail,
          appliedAt: app.appliedAt,
        })),
      })),
    };
  }

  // The `01c` of the latest analysis: registered by the same run as the latest
  // `01_vacancy_analysis.json` (an `01c` of an attempt that did not complete is not the result),
  // with a file that still matches its hash and passes the T1 validator. Anything else, a legacy
  // analysis among them (it writes no `01c`), gives no policy fields. A missing, changed or invalid
  // `01c` never fails the detail; a read error other than ENOENT propagates, as for forced claims.
  async findAnalysisPolicy(
    workspace: Pick<
      ApplicationWorkspace,
      'id' | 'storageRoot' | 'workspacePath'
    >,
    artifacts: readonly ArtifactWithSlugs[],
  ): Promise<WorkspaceAnalysisPolicy | null> {
    const latestOf = (artifactType: string) =>
      artifacts.find(
        (artifact) =>
          artifact.artifactType === artifactType && artifact.isLatest,
      );
    const decisionArtifact = latestOf(ARTIFACT_TYPES.decision);
    const analysisRunId = latestOf(ARTIFACT_TYPES.legacyAnalysis)?.promptRunId;
    if (!decisionArtifact?.promptRunId) return null;
    if (decisionArtifact.promptRunId !== analysisRunId) return null;

    const fileName = decisionArtifact.canonicalFileName;
    const unreadable = (reason: string): null => {
      this.logger.warn(
        `Workspace "${workspace.id}": ${fileName} ${reason}; no policy fields`,
      );
      return null;
    };
    const text = await this.artifactStorage.readFileIfExists(
      path.join(workspace.storageRoot, workspace.workspacePath, fileName),
    );
    if (text === null) return unreadable('is missing');
    const hash = createHash('sha256').update(text, 'utf-8').digest('hex');
    if (hash !== decisionArtifact.contentHash) {
      return unreadable('does not match its registered hash');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return unreadable('is not JSON');
    }
    const validated = validateAnalysisDecision(parsed);
    if (!validated.success) {
      return unreadable(`is invalid (${validated.errors.join('; ')})`);
    }
    const decision = validated.data;
    return {
      decision: decision.decision,
      score: decision.score,
      advisoryDecision: decision.advisory_decision,
      advisoryDiffers: decision.advisory_differs,
      borderline: decision.borderline,
      borderlineReasons: decision.borderline_reasons,
      manualReviewRequired: decision.manual_review_required,
      decidingRule: decision.deciding_rule,
      openQuestions: decision.open_questions,
      policyVersion: decision.policy_version,
    };
  }

  // ADR-046 item 13 (ISSUE-715): whether the pinned stage would read other sources now. Only its
  // pinned types count, so a reduced source set alone is no change. A legacy workspace has no
  // snapshot; an unreadable one is reported as changed, since nothing can confirm it matches.
  private async isSourcesChangedSinceAnalysis(
    workspace: WorkspaceWithRelations,
  ): Promise<boolean> {
    const pinned = await findPinnedSnapshot(this.prisma, workspace);
    if (pinned.kind === 'none') return false;
    if (pinned.kind === 'unreadable') {
      this.logger.warn(
        `Workspace "${workspace.id}": ${pinned.reason}; reporting its sources as changed`,
      );
      return true;
    }
    const activeSources = await this.knowledgeSources.findActive();
    return (
      findSourceMismatches(pinned.stageKey, activeSources, pinned).length > 0
    );
  }

  // ADR-034: a missing artifact (not generated yet) contributes nothing, but a corrupt one is
  // reported in `unreadable` and logged — forced claims must never disappear silently. Other read
  // errors (EACCES, EIO) propagate.
  private async readManualNoteForcedClaims(
    storageRoot: string,
    workspacePath: string,
  ): Promise<{
    claims: WorkspaceManualNoteForcedClaimSummary[];
    unreadable: WorkspaceManualNoteForcedClaimsUnreadableSummary[];
  }> {
    const workspaceAbsPath = path.join(storageRoot, workspacePath);
    const claims: WorkspaceManualNoteForcedClaimSummary[] = [];
    const unreadable: WorkspaceManualNoteForcedClaimsUnreadableSummary[] = [];

    for (const { step, fileName } of FORCED_CLAIMS_ARTIFACTS) {
      const raw = await this.artifactStorage.readFileIfExists(
        path.join(workspaceAbsPath, fileName),
      );
      if (raw === null) {
        continue;
      }

      const parsed = parseForcedClaims(raw);
      if (parsed === null) {
        this.logger.warn(
          `Could not parse manual_note_forced_claims from "${fileName}" in "${workspacePath}"`,
        );
        unreadable.push({ step, fileName });
        continue;
      }
      if (parsed.skippedCount > 0) {
        this.logger.warn(
          `Skipped ${parsed.skippedCount} malformed manual_note_forced_claims entries in "${fileName}" of "${workspacePath}"`,
        );
      }
      for (const entry of parsed.entries) {
        claims.push({ step, ...entry });
      }
    }

    return { claims, unreadable };
  }

  private buildSlugConflict(
    dto: CreateWorkspaceDto,
    workspaceSlug: string,
  ): ConflictException {
    return new ConflictException(
      `A workspace for "${dto.companyNameOriginal} / ${dto.roleTitleOriginal}" already exists ` +
        `for today (workspaceSlug: "${workspaceSlug}")`,
    );
  }

  // Cleanup after a failed create must never mask the error that is being handled.
  private async discardWorkspaceFolder(absolutePath: string): Promise<void> {
    try {
      await this.artifactStorage.removeWorkspaceFolder(absolutePath);
    } catch (error) {
      this.logger.warn(
        `Could not remove workspace folder "${absolutePath}" after a failed create: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async create(
    data: Omit<Prisma.ApplicationWorkspaceCreateInput, 'status'>,
  ): Promise<ApplicationWorkspace> {
    return this.prisma.applicationWorkspace.create({
      data: { ...data, status: WorkspaceStatus.source_saved },
    });
  }

  async appendManualNote(id: string, note: string): Promise<ManualNote> {
    const workspace = await this.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }

    return this.prisma.manualNote.create({
      data: { workspaceId: id, text: note },
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}_${m}_${d}`;
  }
}
