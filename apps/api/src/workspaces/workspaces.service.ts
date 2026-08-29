import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationWorkspace,
  ManualNote,
  Prisma,
  WorkspaceStatus,
} from '@prisma/client';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
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

export type WorkspaceDetailResult = ApplicationWorkspace & {
  artifacts: WorkspaceArtifactSummary[];
  manualNotes: WorkspaceManualNoteSummary[];
  manualNoteForcedClaims: WorkspaceManualNoteForcedClaimSummary[];
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly slugService: SlugService,
    private readonly companyService: CompanyService,
    private readonly vacancyService: VacancyService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  async createWorkspace(
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceCreationResult> {
    const companySlug = this.slugService.normalizeCompanySlug(
      dto.companyNameOriginal,
    );
    const roleSlug = this.slugService.normalizeRoleSlug(dto.roleTitleOriginal);
    const workspaceSlug = `${this.formatDate(new Date())}_${companySlug}_${roleSlug}`;

    const { absolutePath, relativePath } =
      await this.artifactStorage.createWorkspaceFolder(workspaceSlug);

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

          return {
            company: txCompany,
            vacancy: txVacancy,
            workspace: txWorkspace,
          };
        },
      ));
    } catch (err) {
      await this.artifactStorage.removeWorkspaceFolder(absolutePath);

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A workspace for "${dto.companyNameOriginal} / ${dto.roleTitleOriginal}" already exists ` +
            `for today (workspaceSlug: "${workspaceSlug}")`,
        );
      }

      throw err;
    }

    await this.artifactsService.register({
      workspaceId: workspace.id,
      artifactType: 'vacancy_source',
      canonicalFileName: '00_vacancy_source.txt',
      filePath: vacancyFilePath,
      storageRoot: this.artifactStorage.storageRoot,
      contentHash: vacancyTextHash,
      origin: 'pasted',
      mimeType: 'text/plain',
    });

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

  async findAll(): Promise<ApplicationWorkspace[]> {
    return this.prisma.applicationWorkspace.findMany({
      include: { company: true, jobVacancy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ApplicationWorkspace | null> {
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
    const manualNoteForcedClaims = await this.readManualNoteForcedClaims(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    return {
      ...workspace,
      manualNoteForcedClaims,
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

  // ADR-034: best-effort — a missing/unparseable artifact (not yet generated, or predates
  // manual_note_forced_claims) contributes nothing rather than failing the whole detail response.
  private async readManualNoteForcedClaims(
    storageRoot: string,
    workspacePath: string,
  ): Promise<WorkspaceManualNoteForcedClaimSummary[]> {
    const workspaceAbsPath = path.join(storageRoot, workspacePath);
    const claims: WorkspaceManualNoteForcedClaimSummary[] = [];

    for (const { step, fileName } of FORCED_CLAIMS_ARTIFACTS) {
      try {
        const raw = await this.artifactStorage.readFile(
          path.join(workspaceAbsPath, fileName),
        );
        const parsed: unknown = JSON.parse(raw);
        const entries =
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray(
            (parsed as Record<string, unknown>).manual_note_forced_claims,
          )
            ? ((parsed as Record<string, unknown>)
                .manual_note_forced_claims as unknown[])
            : [];

        for (const entry of entries) {
          if (
            entry &&
            typeof entry === 'object' &&
            typeof (entry as Record<string, unknown>).location === 'string' &&
            typeof (entry as Record<string, unknown>).text === 'string'
          ) {
            claims.push({
              step,
              location: (entry as Record<string, unknown>).location as string,
              text: (entry as Record<string, unknown>).text as string,
            });
          }
        }
      } catch {
        // Artifact not generated yet, or unreadable/unparseable — contributes nothing.
      }
    }

    return claims;
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
