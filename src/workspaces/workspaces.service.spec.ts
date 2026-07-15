import { Test, TestingModule } from '@nestjs/testing';
import {
  ApplicationWorkspace,
  Company,
  GeneratedArtifact,
  JobVacancy,
  WorkspaceStatus,
} from '@prisma/client';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { WorkspacesService } from './workspaces.service';

const mockCompany: Company = {
  id: 'cuid-company-1',
  nameOriginal: 'Action1',
  companySlug: 'Action1',
  normalizedName: null,
  sourceType: 'manual',
  notes: null,
  createdAt: new Date('2026-06-29'),
  updatedAt: new Date('2026-06-29'),
};

const mockVacancy: JobVacancy = {
  id: 'cuid-vacancy-1',
  companyId: 'cuid-company-1',
  roleTitleOriginal: 'Backend Developer Node.js',
  roleSlug: 'Backend_Developer_Node_js',
  sourceUrl: null,
  languageDetected: null,
  locationText: null,
  remoteType: null,
  employmentType: null,
  seniority: null,
  vacancyTextPath:
    'storage/applications/2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
  vacancyTextHash: 'sha256-abc123',
  vacancyTextSizeBytes: null,
  sourceFormat: 'pasted_text',
  originalImportedFileName: null,
  createdAt: new Date('2026-06-29'),
  updatedAt: new Date('2026-06-29'),
};

const mockWorkspace: ApplicationWorkspace & {
  company: Company;
  jobVacancy: JobVacancy;
} = {
  id: 'cuid-workspace-1',
  companyId: 'cuid-company-1',
  jobVacancyId: 'cuid-vacancy-1',
  workspaceSlug: '2026_06_29_Action1_Backend_Developer_Node_js',
  storageRoot: 'storage/applications',
  workspacePath:
    'storage/applications/2026_06_29_Action1_Backend_Developer_Node_js',
  status: WorkspaceStatus.source_saved,
  currentDecision: null,
  reviewState: null,
  score: null,
  skipReasonSummary: null,
  nextRecommendedAction: null,
  isSkipped: false,
  isArchived: false,
  createdFrom: 'manual',
  sourceImportedPath: null,
  createdAt: new Date('2026-06-29'),
  updatedAt: new Date('2026-06-29'),
  lastActivityAt: null,
  appliedAt: null,
  appliedVia: null,
  rejectedAt: null,
  rejectionSummary: null,
  notes: null,
  submittedCvArtifactId: null,
  submittedCoverLetterArtifactId: null,
  company: mockCompany,
  jobVacancy: mockVacancy,
};

const mockPrismaService = {
  applicationWorkspace: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockSlugService = {
  normalizeCompanySlug: jest.fn((n: string) => n),
  normalizeRoleSlug: jest.fn((t: string) => t),
};

const mockCompanyService = { create: jest.fn() };
const mockVacancyService = { create: jest.fn() };
const mockArtifactStorageService = {
  storageRoot: '/tmp/test-storage',
  createWorkspaceFolder: jest.fn(),
  saveVacancySource: jest.fn(),
};
const mockArtifactsService = {
  register: jest.fn(),
  findByWorkspaceId: jest.fn(),
};

const mockVacancySourceArtifact: GeneratedArtifact = {
  id: 'artifact-1',
  workspaceId: 'cuid-workspace-1',
  promptRunId: null,
  artifactType: 'vacancy_source',
  canonicalFileName: '00_vacancy_source.txt',
  filePath: 'storage/applications/.../00_vacancy_source.txt',
  storageRoot: 'storage/applications',
  contentHash: 'hash-1',
  isLatest: true,
  version: 1,
  origin: 'pasted',
  status: 'ready',
  mimeType: 'text/plain',
  fileSizeBytes: 512,
  downloadFileName: null,
  createdAt: new Date('2026-06-29T10:00:00Z'),
  updatedAt: new Date('2026-06-29T10:00:00Z'),
};

const mockAnalysisMdArtifact = {
  ...mockVacancySourceArtifact,
  id: 'artifact-2',
  artifactType: 'vacancy_analysis_md',
  canonicalFileName: '01_vacancy_analysis.md',
  origin: 'prompt_1',
  mimeType: 'text/markdown',
};

const mockAnalysisJsonArtifact = {
  ...mockVacancySourceArtifact,
  id: 'artifact-3',
  artifactType: 'vacancy_analysis_json',
  canonicalFileName: '01_vacancy_analysis.json',
  origin: 'prompt_1',
  mimeType: 'application/json',
};

const mockPdfArtifact = {
  ...mockVacancySourceArtifact,
  id: 'artifact-4',
  artifactType: 'cv_export_pdf',
  canonicalFileName: '04_cv_export.pdf',
  origin: 'generated_by_export_service',
  mimeType: 'application/pdf',
  fileSizeBytes: 119350,
  downloadFileName: 'CV_Action1_Backend_Developer_Node_js.pdf',
};

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SlugService, useValue: mockSlugService },
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: VacancyService, useValue: mockVacancyService },
        {
          provide: ArtifactStorageService,
          useValue: mockArtifactStorageService,
        },
        { provide: ArtifactsService, useValue: mockArtifactsService },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    jest.clearAllMocks();
  });

  it('creates a workspace with status source_saved', async () => {
    mockPrismaService.applicationWorkspace.create.mockResolvedValue(
      mockWorkspace,
    );

    const result = await service.create({
      workspaceSlug: '2026_06_29_Action1_Backend_Developer_Node_js',
      storageRoot: 'storage/applications',
      workspacePath:
        'storage/applications/2026_06_29_Action1_Backend_Developer_Node_js',
      createdFrom: 'manual',
      company: { connect: { id: 'cuid-company-1' } },
      jobVacancy: { connect: { id: 'cuid-vacancy-1' } },
    });

    expect(mockPrismaService.applicationWorkspace.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: WorkspaceStatus.source_saved,
        workspaceSlug: '2026_06_29_Action1_Backend_Developer_Node_js',
        createdFrom: 'manual',
      }),
    });
    expect(result.status).toBe(WorkspaceStatus.source_saved);
    expect(result.isSkipped).toBe(false);
  });

  it('finds a workspace by id with company and vacancy included', async () => {
    mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
      mockWorkspace,
    );

    const result = await service.findById('cuid-workspace-1');

    expect(
      mockPrismaService.applicationWorkspace.findUnique,
    ).toHaveBeenCalledWith({
      where: { id: 'cuid-workspace-1' },
      include: { company: true, jobVacancy: true },
    });
    expect(result).toEqual(mockWorkspace);
    expect((result as typeof mockWorkspace)?.company.companySlug).toBe(
      'Action1',
    );
    expect((result as typeof mockWorkspace)?.jobVacancy.roleSlug).toBe(
      'Backend_Developer_Node_js',
    );
  });

  it('returns null when workspace is not found', async () => {
    mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(null);

    const result = await service.findById('nonexistent');

    expect(result).toBeNull();
  });

  describe('getWorkspaceDetail', () => {
    it('returns workspace with status, decision, score and artifact summary', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
        mockWorkspace,
      );
      mockArtifactsService.findByWorkspaceId.mockResolvedValue([
        mockVacancySourceArtifact,
        mockAnalysisMdArtifact,
        mockAnalysisJsonArtifact,
        mockPdfArtifact,
      ]);

      const result = await service.getWorkspaceDetail('cuid-workspace-1');

      expect(mockArtifactsService.findByWorkspaceId).toHaveBeenCalledWith(
        'cuid-workspace-1',
      );
      expect(result?.status).toBe(WorkspaceStatus.source_saved);
      expect(result?.currentDecision).toBeNull();
      expect(result?.score).toBeNull();
      expect(result?.artifacts).toHaveLength(4);

      const pdfSummary = result?.artifacts.find(
        (a) => a.artifactType === 'cv_export_pdf',
      );
      expect(pdfSummary?.canonicalFileName).toBe('04_cv_export.pdf');
      expect(pdfSummary?.downloadFileName).toBe(
        'CV_Action1_Backend_Developer_Node_js.pdf',
      );

      const sourceSummary = result?.artifacts.find(
        (a) => a.artifactType === 'vacancy_source',
      );
      expect(sourceSummary?.canonicalFileName).toBe('00_vacancy_source.txt');
      expect(sourceSummary?.downloadFileName).toBeNull();
    });

    it('returns null when workspace is not found', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(null);

      const result = await service.getWorkspaceDetail('nonexistent');

      expect(result).toBeNull();
      expect(mockArtifactsService.findByWorkspaceId).not.toHaveBeenCalled();
    });
  });
});
