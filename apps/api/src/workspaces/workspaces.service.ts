import { Injectable } from '@nestjs/common';
import { ApplicationWorkspace, Prisma, WorkspaceStatus } from '@prisma/client';
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

export type WorkspaceDetailResult = ApplicationWorkspace & {
  artifacts: WorkspaceArtifactSummary[];
};

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

    const company = await this.companyService.create({
      nameOriginal: dto.companyNameOriginal,
      companySlug,
    });

    const vacancy = await this.vacancyService.create({
      roleTitleOriginal: dto.roleTitleOriginal,
      roleSlug,
      sourceUrl: dto.sourceUrl ?? null,
      vacancyTextPath: vacancyFilePath,
      vacancyTextHash,
      company: { connect: { id: company.id } },
    });

    const workspace = await this.prisma.applicationWorkspace.create({
      data: {
        workspaceSlug,
        storageRoot: this.artifactStorage.storageRoot,
        workspacePath: relativePath,
        status: WorkspaceStatus.source_saved,
        createdFrom: 'manual',
        company: { connect: { id: company.id } },
        jobVacancy: { connect: { id: vacancy.id } },
      },
    });

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

    return {
      ...workspace,
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
    };
  }

  async create(
    data: Omit<Prisma.ApplicationWorkspaceCreateInput, 'status'>,
  ): Promise<ApplicationWorkspace> {
    return this.prisma.applicationWorkspace.create({
      data: { ...data, status: WorkspaceStatus.source_saved },
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}_${m}_${d}`;
  }
}
