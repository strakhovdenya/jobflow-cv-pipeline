import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  GeneratedArtifact,
  Prisma,
  WorkspaceStatus,
} from '@prisma/client';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { isEnoentError } from '../artifacts/fs-errors';
import { CompanyService } from '../company/company.service';
import { AnalysisStageKey } from '../pipeline/analysis/analysis-stages';
import {
  ARTIFACT_TYPES,
  CARRIED_OVER_ORIGIN,
} from '../pipeline/analysis/experimental-analysis.service';
import { validateVacancyRequirements } from '../pipeline/structured-analysis/vacancy-requirements.schema';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { ForkWorkspaceDto } from './dto/fork-workspace.dto';

// The source fork of ADR-046 item 8 (ISSUE-716): a new, independent workspace of the same vacancy
// that a comparison can run with another strategy or context profile. It copies `00` byte for
// byte, keeps the company and role values (both slugs are part of the legacy Prompt 1 input) and
// copies the manual notes; it copies no decision, approval, review state, run or artifact, except
// the frozen `01a` the owner explicitly carries over into a `c` fork. Nothing is enqueued and no
// provider is called: the owner starts the analysis.

const VACANCY_SOURCE_FILE = '00_vacancy_source.txt';
const EXTRACTION_STAGE_KEY: AnalysisStageKey = 'analysis_x1';
const COMPLETED_AI_RUN_STATUS = 'completed';
const FORK_CREATED_FROM = 'fork';
const FORKED_VACANCY_ORIGIN = 'forked';
const REQUEST_KEY_COLUMN = 'forkRequestKey';
const SLUG_COLUMN = 'workspaceSlug';
// `<date>_<company slug>_<role slug>_fork_<n>`: a role slug holds no digit, so no ordinary
// workspace slug ends like this.
const FORK_SLUG_MARKER = 'fork';
const MAX_FORK_SLUG_ATTEMPTS = 200;

export interface ForkOptions {
  analysisStrategy: AnalysisStrategy;
  contextLayout: ContextLayout;
  contextSourceSet: ContextSourceSet;
  carryOverRequirements: boolean;
  requestKey: string | null;
}

export interface ForkResult {
  id: string;
  isNew: boolean;
  status: WorkspaceStatus;
  workspaceSlug: string;
  forkedFromWorkspaceId: string;
  comparisonGroupId: string;
  analysisStrategy: AnalysisStrategy;
  contextLayout: ContextLayout;
  contextSourceSet: ContextSourceSet;
  carryOverRequirements: boolean;
  requestKey: string | null;
  vacancyTextHash: string;
  createdAt: Date;
}

type SourceWorkspace = Prisma.ApplicationWorkspaceGetPayload<{
  include: { company: true; jobVacancy: true };
}>;

type ForkRow = Prisma.ApplicationWorkspaceGetPayload<{
  include: { jobVacancy: true };
}>;

interface ForkFolder {
  absolutePath: string;
  relativePath: string;
  workspaceSlug: string;
}

interface CopiedFile {
  filePath: string;
  hash: string;
}

interface CarriedRequirements {
  artifact: GeneratedArtifact;
  sourcePath: string;
}

const toOptions = (dto: ForkWorkspaceDto): ForkOptions => ({
  analysisStrategy: dto.analysisStrategy,
  contextLayout: dto.contextLayout ?? ContextLayout.single,
  contextSourceSet: dto.contextSourceSet ?? ContextSourceSet.full,
  carryOverRequirements: dto.carryOverRequirements ?? false,
  requestKey: dto.requestKey ?? null,
});

const isUniqueViolationOn = (error: unknown, column: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002' &&
  String(error.meta?.target).includes(column);

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}_${m}_${d}`;
};

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class WorkspaceForkService {
  private readonly logger = new Logger(WorkspaceForkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    private readonly companyService: CompanyService,
    private readonly vacancyService: VacancyService,
  ) {}

  async fork(sourceId: string, dto: ForkWorkspaceDto): Promise<ForkResult> {
    const options = toOptions(dto);
    const source = await this.prisma.applicationWorkspace.findUnique({
      where: { id: sourceId },
      include: { company: true, jobVacancy: true },
    });
    if (!source) {
      throw new NotFoundException(`Workspace "${sourceId}" not found`);
    }
    if (options.requestKey !== null) {
      const existing = await this.findByRequestKey(
        source.id,
        options.requestKey,
      );
      if (existing) return this.replay(existing, options);
    }
    this.assertForkable(source, options);

    const sourceAbsPath = path.resolve(
      source.storageRoot,
      source.workspacePath,
    );
    const vacancyText = await this.readVerifiedVacancy(source, sourceAbsPath);
    const carried = options.carryOverRequirements
      ? await this.findCarriableRequirements(source, sourceAbsPath, vacancyText)
      : null;

    const folder = await this.createForkFolder(source);
    try {
      const fork = await this.createFork(
        source,
        sourceAbsPath,
        options,
        folder,
        carried,
      );
      return this.toResult(fork, true, carried !== null);
    } catch (error) {
      await this.discardFolder(folder.absolutePath);
      if (
        options.requestKey !== null &&
        isUniqueViolationOn(error, REQUEST_KEY_COLUMN)
      ) {
        // Another request with the same key committed first: its fork is the answer.
        const existing = await this.findByRequestKey(
          source.id,
          options.requestKey,
        );
        if (existing) return this.replay(existing, options);
      }
      if (isUniqueViolationOn(error, SLUG_COLUMN)) {
        throw new ConflictException(
          `A workspace with slug "${folder.workspaceSlug}" already exists`,
        );
      }
      throw error;
    }
  }

  // ---------- refusals before anything is written ----------

  private assertForkable(source: SourceWorkspace, options: ForkOptions): void {
    if (source.isArchived || source.status === WorkspaceStatus.archived) {
      throw new BadRequestException(
        `Workspace "${source.id}" is archived and cannot be forked`,
      );
    }
    if (
      options.carryOverRequirements &&
      options.analysisStrategy !== AnalysisStrategy.c
    ) {
      throw new BadRequestException(
        'carryOverRequirements needs strategy "c": only its X1 stage reads the carried 01a',
      );
    }
  }

  // The `00` file must still be the vacancy its row records: a fork must never compare a
  // different text under the same hash.
  private async readVerifiedVacancy(
    source: SourceWorkspace,
    sourceAbsPath: string,
  ): Promise<string> {
    const sourcePath = path.join(sourceAbsPath, VACANCY_SOURCE_FILE);
    let hash: string;
    try {
      hash = await this.artifactStorage.hashFile(sourcePath);
    } catch (error) {
      if (!isEnoentError(error)) throw error;
      throw new BadRequestException(
        `The vacancy source of workspace "${source.id}" is missing; it cannot be forked`,
      );
    }
    if (hash !== source.jobVacancy.vacancyTextHash) {
      throw new BadRequestException(
        `The vacancy source of workspace "${source.id}" does not match its recorded hash; it cannot be forked`,
      );
    }
    return this.artifactStorage.readFile(sourcePath);
  }

  // The source's latest `01a`, only when an X1 run of the source itself produced it with a
  // recorded identity and a completed AiRun, its file still hashes to the registered value and it
  // validates against the vacancy. A carried `01a` of a fork is not carried again.
  private async findCarriableRequirements(
    source: SourceWorkspace,
    sourceAbsPath: string,
    vacancyText: string,
  ): Promise<CarriedRequirements> {
    const refuse = (reason: string) =>
      new BadRequestException(
        `Workspace "${source.id}" has no 01a that can be carried over: ${reason}`,
      );
    const artifact = await this.prisma.generatedArtifact.findFirst({
      where: {
        workspaceId: source.id,
        artifactType: ARTIFACT_TYPES.requirements,
        isLatest: true,
      },
    });
    if (!artifact?.promptRunId) {
      throw refuse('no registered 01a from an X1 run');
    }
    const run = await this.prisma.promptRun.findUnique({
      where: { id: artifact.promptRunId },
      include: { aiRun: true },
    });
    const isOwnExtraction =
      run !== null &&
      run.workspaceId === source.id &&
      run.promptStep === EXTRACTION_STAGE_KEY &&
      run.inputHash !== null &&
      run.aiRun?.status === COMPLETED_AI_RUN_STATUS;
    if (!isOwnExtraction) {
      throw refuse(
        'it was not produced by a completed X1 run of this workspace (fork the workspace that produced it)',
      );
    }

    const sourcePath = path.join(sourceAbsPath, artifact.canonicalFileName);
    const text = await this.artifactStorage.readFileIfExists(sourcePath);
    if (text === null) throw refuse('its file is missing');
    const hash = await this.artifactStorage.hashFile(sourcePath);
    if (hash !== artifact.contentHash) {
      throw refuse('its file no longer matches the registered hash');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw refuse('its file is not JSON');
    }
    const validated = validateVacancyRequirements(parsed, vacancyText);
    if (!validated.success) {
      throw refuse(`it fails validation (${validated.errors.join('; ')})`);
    }
    return { artifact, sourcePath };
  }

  // ---------- the fork ----------

  // Exclusive: the leaf folder is created without `recursive`, so a folder of another workspace
  // is never reused; the next discriminator is tried instead.
  private async createForkFolder(source: SourceWorkspace): Promise<ForkFolder> {
    const base = [
      formatDate(new Date()),
      source.company.companySlug,
      source.jobVacancy.roleSlug,
      FORK_SLUG_MARKER,
    ].join('_');
    for (let index = 1; index <= MAX_FORK_SLUG_ATTEMPTS; index++) {
      const workspaceSlug = `${base}_${index}`;
      const folder =
        await this.artifactStorage.createWorkspaceFolderExclusive(
          workspaceSlug,
        );
      if (folder) return { ...folder, workspaceSlug };
    }
    throw new ConflictException(
      `No free fork slug for "${base}" after ${MAX_FORK_SLUG_ATTEMPTS} attempts`,
    );
  }

  // The files are copied into the new, exclusive folder first; every row is written in one
  // transaction, so a failure leaves no row, and the caller removes the folder.
  private async createFork(
    source: SourceWorkspace,
    sourceAbsPath: string,
    options: ForkOptions,
    folder: ForkFolder,
    carried: CarriedRequirements | null,
  ): Promise<ForkRow> {
    const vacancyCopy = await this.copyVerified(
      path.join(sourceAbsPath, VACANCY_SOURCE_FILE),
      folder,
      VACANCY_SOURCE_FILE,
      source.jobVacancy.vacancyTextHash,
    );
    const requirementsCopy = carried
      ? await this.copyVerified(
          carried.sourcePath,
          folder,
          carried.artifact.canonicalFileName,
          carried.artifact.contentHash,
        )
      : null;
    const notes = await this.prisma.manualNote.findMany({
      where: { workspaceId: source.id },
      orderBy: { createdAt: 'asc' },
    });
    // The source's own id starts a group; two concurrent first forks compute the same id.
    const comparisonGroupId = source.comparisonGroupId ?? source.id;

    return this.prisma.$transaction(async (tx) => {
      await tx.applicationWorkspace.updateMany({
        where: { id: source.id, comparisonGroupId: null },
        data: { comparisonGroupId },
      });
      const company = await this.companyService.create(
        {
          nameOriginal: source.company.nameOriginal,
          companySlug: source.company.companySlug,
          normalizedName: source.company.normalizedName,
        },
        tx,
      );
      const vacancy = await this.vacancyService.create(
        {
          roleTitleOriginal: source.jobVacancy.roleTitleOriginal,
          roleSlug: source.jobVacancy.roleSlug,
          sourceUrl: source.jobVacancy.sourceUrl,
          languageDetected: source.jobVacancy.languageDetected,
          locationText: source.jobVacancy.locationText,
          remoteType: source.jobVacancy.remoteType,
          employmentType: source.jobVacancy.employmentType,
          seniority: source.jobVacancy.seniority,
          vacancyTextPath: vacancyCopy.filePath,
          vacancyTextHash: vacancyCopy.hash,
          vacancyTextSizeBytes: source.jobVacancy.vacancyTextSizeBytes,
          sourceFormat: source.jobVacancy.sourceFormat,
          originalImportedFileName: source.jobVacancy.originalImportedFileName,
          company: { connect: { id: company.id } },
        },
        tx,
      );
      // Created at source_saved, the creation default of every workspace (ADR-038): no transition.
      const fork = await tx.applicationWorkspace.create({
        data: {
          workspaceSlug: folder.workspaceSlug,
          storageRoot: this.artifactStorage.storageRoot,
          workspacePath: folder.relativePath,
          status: WorkspaceStatus.source_saved,
          createdFrom: FORK_CREATED_FROM,
          analysisStrategy: options.analysisStrategy,
          contextLayout: options.contextLayout,
          contextSourceSet: options.contextSourceSet,
          forkRequestKey: options.requestKey,
          comparisonGroupId,
          forkedFrom: { connect: { id: source.id } },
          company: { connect: { id: company.id } },
          jobVacancy: { connect: { id: vacancy.id } },
        },
        include: { jobVacancy: true },
      });

      await this.artifactsService.register(
        {
          workspaceId: fork.id,
          artifactType: 'vacancy_source',
          canonicalFileName: VACANCY_SOURCE_FILE,
          filePath: vacancyCopy.filePath,
          storageRoot: this.artifactStorage.storageRoot,
          contentHash: vacancyCopy.hash,
          origin: FORKED_VACANCY_ORIGIN,
          mimeType: 'text/plain',
        },
        tx,
      );
      if (notes.length > 0) {
        // Text, legacy flag and creation time (the order X2 and Prompt 1 read them in); their
        // applications belong to the source's runs and are not copied.
        await tx.manualNote.createMany({
          data: notes.map((note) => ({
            workspaceId: fork.id,
            text: note.text,
            isLegacy: note.isLegacy,
            createdAt: note.createdAt,
          })),
        });
      }
      if (carried && requirementsCopy) {
        await this.artifactsService.register(
          {
            workspaceId: fork.id,
            // The source's X1 run stays the producing run: no PromptRun or AiRun is copied.
            promptRunId: carried.artifact.promptRunId as string,
            artifactType: ARTIFACT_TYPES.requirements,
            canonicalFileName: carried.artifact.canonicalFileName,
            filePath: requirementsCopy.filePath,
            storageRoot: this.artifactStorage.storageRoot,
            contentHash: requirementsCopy.hash,
            origin: CARRIED_OVER_ORIGIN,
            mimeType: carried.artifact.mimeType ?? undefined,
            downloadFileName: carried.artifact.downloadFileName ?? undefined,
          },
          tx,
        );
      }
      return fork;
    });
  }

  private async copyVerified(
    sourcePath: string,
    folder: ForkFolder,
    fileName: string,
    expectedHash: string,
  ): Promise<CopiedFile> {
    const copied = await this.artifactStorage.copyFileExclusive(
      sourcePath,
      folder.absolutePath,
      fileName,
    );
    if (copied.hash !== expectedHash) {
      throw new InternalServerErrorException(
        `The copy of "${fileName}" does not match its source hash`,
      );
    }
    return copied;
  }

  // ---------- idempotent repeat ----------

  private findByRequestKey(
    sourceId: string,
    requestKey: string,
  ): Promise<ForkRow | null> {
    return this.prisma.applicationWorkspace.findFirst({
      where: { forkedFromWorkspaceId: sourceId, forkRequestKey: requestKey },
      include: { jobVacancy: true },
    });
  }

  // The same key is the same request: it must ask for the same fork, else it is a client error.
  private async replay(
    existing: ForkRow,
    options: ForkOptions,
  ): Promise<ForkResult> {
    const carriedCount = await this.prisma.generatedArtifact.count({
      where: {
        workspaceId: existing.id,
        artifactType: ARTIFACT_TYPES.requirements,
        origin: CARRIED_OVER_ORIGIN,
      },
    });
    const hasCarriedRequirements = carriedCount > 0;
    const isSameRequest =
      existing.analysisStrategy === options.analysisStrategy &&
      existing.contextLayout === options.contextLayout &&
      existing.contextSourceSet === options.contextSourceSet &&
      hasCarriedRequirements === options.carryOverRequirements;
    if (!isSameRequest) {
      throw new ConflictException(
        `Request key "${options.requestKey}" already created fork "${existing.id}" with other options`,
      );
    }
    return this.toResult(existing, false, hasCarriedRequirements);
  }

  private toResult(
    fork: ForkRow,
    isNew: boolean,
    carryOverRequirements: boolean,
  ): ForkResult {
    return {
      id: fork.id,
      isNew,
      status: fork.status,
      workspaceSlug: fork.workspaceSlug,
      forkedFromWorkspaceId: fork.forkedFromWorkspaceId as string,
      comparisonGroupId: fork.comparisonGroupId as string,
      analysisStrategy: fork.analysisStrategy,
      contextLayout: fork.contextLayout,
      contextSourceSet: fork.contextSourceSet,
      carryOverRequirements,
      requestKey: fork.forkRequestKey,
      vacancyTextHash: fork.jobVacancy.vacancyTextHash,
      createdAt: fork.createdAt,
    };
  }

  // Cleanup after a failed fork must never mask the error being handled.
  private async discardFolder(absolutePath: string): Promise<void> {
    try {
      await this.artifactStorage.removeWorkspaceFolder(absolutePath);
    } catch (error) {
      this.logger.warn(
        `Could not remove fork folder "${absolutePath}" after a failed fork: ${errorMessageOf(error)}`,
      );
    }
  }
}
