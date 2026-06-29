import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { WorkspacesService } from './workspaces.service';

const mockCompany = {
  id: 'cuid-company-1',
  nameOriginal: 'Action1',
  companySlug: 'Action1',
  normalizedName: null,
  sourceType: 'manual',
  notes: null,
  createdAt: new Date('2026-06-29'),
  updatedAt: new Date('2026-06-29'),
};

const mockVacancy = {
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

const mockWorkspace = {
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
const mockArtifactsService = { register: jest.fn() };

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
});
