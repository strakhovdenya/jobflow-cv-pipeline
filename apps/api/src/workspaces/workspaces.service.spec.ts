import { createHash } from 'crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AnalysisStrategy,
  ApplicationWorkspace,
  Company,
  ContextLayout,
  ContextSourceSet,
  GeneratedArtifact,
  JobVacancy,
  KnowledgeSource,
  Prisma,
  WorkspaceStatus,
} from '@prisma/client';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
import { KnowledgeSourcesService } from '../knowledge-sources/knowledge-sources.service';
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
  originalDecision: null,
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
  lastStepErrorStep: null,
  lastStepErrorMessage: null,
  lastStepErrorAt: null,
  analysisStrategy: AnalysisStrategy.legacy,
  contextLayout: ContextLayout.single,
  contextSourceSet: ContextSourceSet.full,
  forkedFromWorkspaceId: null,
  forkRequestKey: null,
  comparisonGroupId: null,
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
    update: jest.fn(),
  },
  manualNote: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  generatedArtifact: {
    findFirst: jest.fn(),
  },
  promptRun: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockSlugService = {
  normalizeCompanySlug: jest.fn((n: string) => n),
  normalizeRoleSlug: jest.fn((t: string) => t),
};

const mockCompanyService = { create: jest.fn() };
const mockVacancyService = { create: jest.fn() };
const mockArtifactStorageService = {
  storageRoot: '/tmp/test-storage',
  createWorkspaceFolderExclusive: jest.fn(),
  saveVacancySource: jest.fn(),
  removeWorkspaceFolder: jest.fn(),
  readFileIfExists: jest.fn(),
};
const mockArtifactsService = {
  register: jest.fn(),
  findByWorkspaceId: jest.fn(),
};
const mockKnowledgeSourcesService = { findActive: jest.fn() };

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
        {
          provide: KnowledgeSourcesService,
          useValue: mockKnowledgeSourcesService,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrismaService) => unknown) => cb(mockPrismaService),
    );
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

  it('creates a workspace with legacy strategy defaults', async () => {
    // The database applies the column defaults of the schema; the mock does the same with the
    // defaults the generated client records, so the test follows the real schema.
    const model = Prisma.dmmf.datamodel.models.find(
      (item) => item.name === 'ApplicationWorkspace',
    );
    const schemaDefaults = Object.fromEntries(
      (model?.fields ?? [])
        .filter((field) =>
          [
            'analysisStrategy',
            'contextLayout',
            'contextSourceSet',
            'forkedFromWorkspaceId',
            'comparisonGroupId',
          ].includes(field.name),
        )
        .map((field) => [field.name, field.default ?? null]),
    );
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    mockPrismaService.applicationWorkspace.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...mockWorkspace, ...schemaDefaults, ...data }),
    );
    mockArtifactsService.register.mockResolvedValue({
      id: 'artifact-1',
    } as GeneratedArtifact);

    const result = await service.createWorkspace({
      companyNameOriginal: 'Action1',
      roleTitleOriginal: 'Backend Developer Node.js',
      vacancyText: 'We are hiring...',
    });
    const created = (await mockPrismaService.applicationWorkspace.create.mock
      .results[0].value) as ApplicationWorkspace;

    expect(result.id).toBe(created.id);
    expect(schemaDefaults).toEqual({
      analysisStrategy: AnalysisStrategy.legacy,
      contextLayout: ContextLayout.single,
      contextSourceSet: ContextSourceSet.full,
      forkedFromWorkspaceId: null,
      comparisonGroupId: null,
    });
    const [[{ data }]] = mockPrismaService.applicationWorkspace.create.mock
      .calls as [[{ data: Record<string, unknown> }]];
    for (const field of Object.keys(schemaDefaults)) {
      expect(data).not.toHaveProperty(field);
    }
    expect(created).toEqual(
      expect.objectContaining({
        analysisStrategy: AnalysisStrategy.legacy,
        contextLayout: ContextLayout.single,
        contextSourceSet: ContextSourceSet.full,
        forkedFromWorkspaceId: null,
        comparisonGroupId: null,
      }),
    );
  });

  it('registers the vacancy_source artifact with mimeType text/plain', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    mockPrismaService.applicationWorkspace.create.mockResolvedValue(
      mockWorkspace,
    );
    mockArtifactsService.register.mockResolvedValue({
      id: 'artifact-1',
    } as GeneratedArtifact);

    await service.createWorkspace({
      companyNameOriginal: 'Action1',
      roleTitleOriginal: 'Backend Developer Node.js',
      vacancyText: 'We are hiring...',
    });

    expect(mockArtifactsService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'vacancy_source',
        canonicalFileName: '00_vacancy_source.txt',
        mimeType: 'text/plain',
      }),
      mockPrismaService,
    );
  });

  it('removes the created folder and rethrows when registering the vacancy artifact fails inside the transaction', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    mockPrismaService.applicationWorkspace.create.mockResolvedValue(
      mockWorkspace,
    );
    mockArtifactsService.register.mockRejectedValue(new Error('disk full'));

    await expect(
      service.createWorkspace({
        companyNameOriginal: 'Action1',
        roleTitleOriginal: 'Backend Developer Node.js',
        vacancyText: 'We are hiring...',
      }),
    ).rejects.toThrow('disk full');

    expect(
      mockArtifactStorageService.removeWorkspaceFolder,
    ).toHaveBeenCalledWith(
      '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
    );
  });

  it('creates company, vacancy and workspace inside a single $transaction', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    mockPrismaService.applicationWorkspace.create.mockResolvedValue(
      mockWorkspace,
    );
    mockArtifactsService.register.mockResolvedValue({
      id: 'artifact-1',
    } as GeneratedArtifact);

    await service.createWorkspace({
      companyNameOriginal: 'Action1',
      roleTitleOriginal: 'Backend Developer Node.js',
      vacancyText: 'We are hiring...',
    });

    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockCompanyService.create).toHaveBeenCalledWith(
      expect.objectContaining({ nameOriginal: 'Action1' }),
      mockPrismaService,
    );
    expect(mockVacancyService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        roleTitleOriginal: 'Backend Developer Node.js',
      }),
      mockPrismaService,
    );
  });

  it('throws ConflictException and removes the created folder when workspaceSlug already exists (P2002)', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`workspaceSlug`)',
      {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['workspaceSlug'] },
      },
    );
    mockPrismaService.applicationWorkspace.create.mockRejectedValue(p2002);

    await expect(
      service.createWorkspace({
        companyNameOriginal: 'Action1',
        roleTitleOriginal: 'Backend Developer Node.js',
        vacancyText: 'We are hiring...',
      }),
    ).rejects.toThrow(ConflictException);

    expect(
      mockArtifactStorageService.removeWorkspaceFolder,
    ).toHaveBeenCalledWith(
      '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
    );
    expect(mockArtifactsService.register).not.toHaveBeenCalled();
  });

  it('throws ConflictException and leaves an existing workspace folder untouched', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      null,
    );

    await expect(
      service.createWorkspace({
        companyNameOriginal: 'Action1',
        roleTitleOriginal: 'Backend Developer Node.js',
        vacancyText: 'We are hiring...',
      }),
    ).rejects.toThrow(ConflictException);

    expect(mockArtifactStorageService.saveVacancySource).not.toHaveBeenCalled();
    expect(
      mockArtifactStorageService.removeWorkspaceFolder,
    ).not.toHaveBeenCalled();
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('removes the created folder and rethrows on a non-conflict transaction failure', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    const dbError = new Error('connection lost');
    mockPrismaService.applicationWorkspace.create.mockRejectedValue(dbError);

    await expect(
      service.createWorkspace({
        companyNameOriginal: 'Action1',
        roleTitleOriginal: 'Backend Developer Node.js',
        vacancyText: 'We are hiring...',
      }),
    ).rejects.toThrow('connection lost');

    expect(
      mockArtifactStorageService.removeWorkspaceFolder,
    ).toHaveBeenCalledWith(
      '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
    );
  });

  it('still throws the ConflictException when removing the created folder also fails', async () => {
    mockArtifactStorageService.createWorkspaceFolderExclusive.mockResolvedValue(
      {
        absolutePath:
          '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
        relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
      },
    );
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    mockPrismaService.applicationWorkspace.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['workspaceSlug'] },
      }),
    );
    mockArtifactStorageService.removeWorkspaceFolder.mockRejectedValue(
      new Error('EBUSY'),
    );

    await expect(
      service.createWorkspace({
        companyNameOriginal: 'Action1',
        roleTitleOriginal: 'Backend Developer Node.js',
        vacancyText: 'We are hiring...',
      }),
    ).rejects.toThrow(ConflictException);
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
    it('returns workspace with status, decision, score, artifact and manual note summaries', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
        mockWorkspace,
      );
      mockArtifactsService.findByWorkspaceId.mockResolvedValue([
        mockVacancySourceArtifact,
        mockAnalysisMdArtifact,
        mockAnalysisJsonArtifact,
        mockPdfArtifact,
      ]);
      mockPrismaService.manualNote.findMany.mockResolvedValue([
        {
          id: 'note-1',
          text: 'EGZ добавляй',
          isLegacy: false,
          createdAt: new Date('2026-08-26T10:00:00Z'),
          applications: [
            {
              stepDetail: 'generate',
              appliedAt: new Date('2026-08-26T10:05:00Z'),
              promptRun: { promptStep: 'prompt_2' },
            },
          ],
        },
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

      expect(result?.manualNotes).toHaveLength(1);
      expect(result?.manualNotes[0]).toEqual({
        id: 'note-1',
        text: 'EGZ добавляй',
        isLegacy: false,
        createdAt: new Date('2026-08-26T10:00:00Z'),
        applications: [
          {
            promptStep: 'prompt_2',
            stepDetail: 'generate',
            appliedAt: new Date('2026-08-26T10:05:00Z'),
          },
        ],
      });
    });

    it('returns null when workspace is not found', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(null);

      const result = await service.getWorkspaceDetail('nonexistent');

      expect(result).toBeNull();
      expect(mockArtifactsService.findByWorkspaceId).not.toHaveBeenCalled();
      expect(mockPrismaService.manualNote.findMany).not.toHaveBeenCalled();
    });

    describe('manualNoteForcedClaims (ADR-034)', () => {
      beforeEach(() => {
        mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
          mockWorkspace,
        );
        mockArtifactsService.findByWorkspaceId.mockResolvedValue([]);
        mockPrismaService.manualNote.findMany.mockResolvedValue([]);
      });

      it('aggregates manual_note_forced_claims from the CV content artifact, tagged with its step', async () => {
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (p: string) => {
            if (p.endsWith('02_targeted_cv_content.json')) {
              return Promise.resolve(
                JSON.stringify({
                  manual_note_forced_claims: [
                    {
                      location: 'cv_content.top_skills[2]',
                      text: 'EGZ добавляй',
                    },
                  ],
                }),
              );
            }
            return Promise.resolve(null);
          },
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([
          {
            step: 'prompt_2',
            location: 'cv_content.top_skills[2]',
            text: 'EGZ добавляй',
          },
        ]);
      });

      it('aggregates claims across multiple artifacts when more than one exists', async () => {
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (p: string) => {
            if (p.endsWith('01_vacancy_analysis.json')) {
              return Promise.resolve(
                JSON.stringify({
                  manual_note_forced_claims: [
                    { location: 'must_have[2]', text: 'EGZ добавляй' },
                  ],
                }),
              );
            }
            if (p.endsWith('02_targeted_cv_content.json')) {
              return Promise.resolve(
                JSON.stringify({
                  manual_note_forced_claims: [
                    {
                      location: 'cv_content.top_skills[2]',
                      text: 'EGZ добавляй',
                    },
                  ],
                }),
              );
            }
            return Promise.resolve(null);
          },
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([
          { step: 'prompt_1', location: 'must_have[2]', text: 'EGZ добавляй' },
          {
            step: 'prompt_2',
            location: 'cv_content.top_skills[2]',
            text: 'EGZ добавляй',
          },
        ]);
      });

      it('returns an empty array when no artifact exists yet', async () => {
        mockArtifactStorageService.readFileIfExists.mockResolvedValue(null);

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([]);
      });

      it('reports a corrupt artifact in manualNoteForcedClaimsUnreadable instead of dropping it silently', async () => {
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (p: string) =>
            Promise.resolve(
              p.endsWith('02_targeted_cv_content.json')
                ? 'not valid json{{{'
                : null,
            ),
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([]);
        expect(result?.manualNoteForcedClaimsUnreadable).toEqual([
          { step: 'prompt_2', fileName: '02_targeted_cv_content.json' },
        ]);
      });

      it('reports an artifact whose manual_note_forced_claims is not an array as unreadable', async () => {
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (p: string) =>
            Promise.resolve(
              p.endsWith('01_vacancy_analysis.json')
                ? JSON.stringify({ manual_note_forced_claims: 'EGZ' })
                : null,
            ),
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaimsUnreadable).toEqual([
          { step: 'prompt_1', fileName: '01_vacancy_analysis.json' },
        ]);
      });

      it('keeps the well-formed claims and skips only the malformed entries', async () => {
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (p: string) =>
            Promise.resolve(
              p.endsWith('02_targeted_cv_content.json')
                ? JSON.stringify({
                    manual_note_forced_claims: [
                      { location: 'cv_content.top_skills[2]', text: 'EGZ' },
                      { location: 'cv_content.top_skills[3]' },
                      null,
                    ],
                  })
                : null,
            ),
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([
          {
            step: 'prompt_2',
            location: 'cv_content.top_skills[2]',
            text: 'EGZ',
          },
        ]);
        expect(result?.manualNoteForcedClaimsUnreadable).toEqual([]);
      });

      it('propagates a non-ENOENT read error instead of treating it as "no claims"', async () => {
        const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
        mockArtifactStorageService.readFileIfExists.mockRejectedValue(denied);

        await expect(
          service.getWorkspaceDetail('cuid-workspace-1'),
        ).rejects.toBe(denied);
      });

      it('ignores manual_note_forced_claims when it is missing from an otherwise-valid artifact', async () => {
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (p: string) => {
            if (p.endsWith('02_targeted_cv_content.json')) {
              return Promise.resolve(JSON.stringify({ headline: 'Backend' }));
            }
            return Promise.resolve(null);
          },
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([]);
      });
    });

    // ADR-046 item 13 (ISSUE-715): the real comparison of source-snapshot-comparison.ts runs here;
    // only the database rows are faked.
    describe('sourcesChangedSinceAnalysis', () => {
      const source = (
        sourceType: string,
        contentHash = `hash-${sourceType}`,
      ): KnowledgeSource => ({
        id: `ks-${sourceType}`,
        sourceType,
        filePath: `/knowledge-sources/${sourceType}.md`,
        contentHash,
        isActive: true,
        versionLabel: null,
        importedAt: new Date('2026-11-01'),
        createdAt: new Date('2026-11-01'),
        updatedAt: new Date('2026-11-01'),
      });
      const ANALYSIS_TYPES = [
        'master_cv',
        'profile_summary',
        'tech_stack',
        'project_inventory',
        'career_cases',
        'cv_rules',
        'certifications',
      ];
      const ACTIVE = [...ANALYSIS_TYPES, 'layout'].map((type) => source(type));
      const ANALYSIS_SOURCES = ACTIVE.filter((item) =>
        ANALYSIS_TYPES.includes(item.sourceType),
      );
      const snapshotOf = (sources: KnowledgeSource[]) =>
        JSON.stringify({
          snapshotId: 'snap-0000000000000000',
          catalogHash: 'catalog-hash',
          knowledgeSources: sources.map((item) => ({
            id: item.id,
            filePath: item.filePath,
            sourceType: item.sourceType,
            contentHash: item.contentHash,
            versionLabel: item.versionLabel,
          })),
        });
      const latestAnalysisBy = (
        promptStep: string,
        sourceSnapshot: string | null,
      ) => {
        mockPrismaService.generatedArtifact.findFirst.mockResolvedValue({
          promptRunId: 'pr-analysis',
        });
        mockPrismaService.promptRun.findUnique.mockResolvedValue({
          workspaceId: mockWorkspace.id,
          promptStep,
          sourceSnapshot,
        });
      };
      const activeWith = (
        changedHashes: Record<string, string>,
      ): KnowledgeSource[] =>
        ACTIVE.map((item) =>
          item.sourceType in changedHashes
            ? source(item.sourceType, changedHashes[item.sourceType])
            : item,
        );

      beforeEach(() => {
        mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
          mockWorkspace,
        );
        mockArtifactsService.findByWorkspaceId.mockResolvedValue([]);
        mockPrismaService.manualNote.findMany.mockResolvedValue([]);
        mockArtifactStorageService.readFileIfExists.mockResolvedValue(null);
        mockPrismaService.generatedArtifact.findFirst.mockResolvedValue(null);
        mockPrismaService.promptRun.findUnique.mockResolvedValue(null);
        mockKnowledgeSourcesService.findActive.mockResolvedValue(ACTIVE);
      });

      it('reports sources changed since analysis', async () => {
        latestAnalysisBy('analysis_x2', snapshotOf(ANALYSIS_SOURCES));
        mockKnowledgeSourcesService.findActive.mockResolvedValue(
          activeWith({ career_cases: 'hash-new' }),
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.sourcesChangedSinceAnalysis).toBe(true);
      });

      it('reports no source change when the snapshot matches', async () => {
        // `layout` is active too, but the analysis stage does not read it
        latestAnalysisBy('analysis_b', snapshotOf(ANALYSIS_SOURCES));

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.sourcesChangedSinceAnalysis).toBe(false);
        expect(mockKnowledgeSourcesService.findActive).toHaveBeenCalled();
      });

      it('reports no source change for a legacy workspace', async () => {
        latestAnalysisBy('prompt_1', '[]');
        mockKnowledgeSourcesService.findActive.mockResolvedValue(
          activeWith({ career_cases: 'hash-new' }),
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.sourcesChangedSinceAnalysis).toBe(false);
        expect(mockKnowledgeSourcesService.findActive).not.toHaveBeenCalled();
      });

      it('reports no source change for a workspace without a completed analysis', async () => {
        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.sourcesChangedSinceAnalysis).toBe(false);
        expect(mockPrismaService.promptRun.findUnique).not.toHaveBeenCalled();
      });

      it('reports a source change when the pinned snapshot cannot be read', async () => {
        latestAnalysisBy('analysis_x2', '{not json');

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.sourcesChangedSinceAnalysis).toBe(true);
      });

      it('reports no source change for a type the assessment set left out', async () => {
        mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue({
          ...mockWorkspace,
          analysisStrategy: AnalysisStrategy.c,
          contextSourceSet: ContextSourceSet.assessment,
        });
        latestAnalysisBy(
          'analysis_x2',
          snapshotOf(
            ANALYSIS_SOURCES.filter(
              (item) =>
                item.sourceType !== 'profile_summary' &&
                item.sourceType !== 'cv_rules',
            ),
          ),
        );
        mockKnowledgeSourcesService.findActive.mockResolvedValue(
          activeWith({ profile_summary: 'hash-new' }),
        );

        const unchanged = await service.getWorkspaceDetail('cuid-workspace-1');

        mockKnowledgeSourcesService.findActive.mockResolvedValue(
          activeWith({ profile_summary: 'hash-new', career_cases: 'hash-new' }),
        );
        const changed = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(unchanged?.sourcesChangedSinceAnalysis).toBe(false);
        expect(changed?.sourcesChangedSinceAnalysis).toBe(true);
      });
    });

    describe('analysisPolicy (ISSUE-716)', () => {
      const ANALYSIS_RUN = 'pr-x2';
      // A contract-valid 01c as the policy writes it (synthetic values).
      const decisionJson = JSON.stringify(
        {
          contract_version: '1.0',
          policy_version: 'adr-046@2026-11-26',
          snapshot_id: 'snapshot-a',
          decision: 'maybe',
          score: 68,
          category_scores: {
            tech_stack: 20,
            production_backend: 12,
            domain_product: 5,
            seniority: 12,
            language_location: 10,
            evidence_quality: 9,
          },
          deciding_rule: 'B2',
          trace: [
            { row: 'V', applied: true, inputs: {}, effect: 'input valid' },
            {
              row: 'F',
              applied: true,
              inputs: { deciding_rule: 'B2' },
              effect: 'decision maybe by B2',
            },
          ],
          manual_review_required: true,
          borderline: true,
          borderline_reasons: ['F: score 68 is within 3 points of 65'],
          open_questions: [
            { condition: 'eligibility.remote_location', note: 'unclear' },
          ],
          advisory_decision: 'apply',
          advisory_differs: true,
          counts: {
            strong_points: 3,
            credible_points: 4,
            must_have_total: 3,
            must_have_met: 2,
            stacking_categories: ['core_stack'],
          },
          shadow_sub_scores: { tech_stack: 19, evidence_quality: null },
        },
        null,
        2,
      );
      const sha256 = (text: string) =>
        createHash('sha256').update(text, 'utf-8').digest('hex');
      const decisionArtifact = (
        overrides: Partial<GeneratedArtifact> = {},
      ) => ({
        ...mockVacancySourceArtifact,
        id: 'artifact-01c',
        promptRunId: ANALYSIS_RUN,
        artifactType: 'analysis_decision_json',
        canonicalFileName: '01c_analysis_decision.json',
        contentHash: sha256(decisionJson),
        origin: 'analysis_x2',
        ...overrides,
      });
      const analysisArtifact = (promptRunId: string | null = ANALYSIS_RUN) => ({
        ...mockAnalysisJsonArtifact,
        promptRunId,
        origin: 'analysis_x2',
      });
      const experimentalWorkspace = {
        ...mockWorkspace,
        analysisStrategy: AnalysisStrategy.c,
        contextLayout: ContextLayout.boundary,
        contextSourceSet: ContextSourceSet.assessment,
        forkedFromWorkspaceId: 'cuid-workspace-source',
        comparisonGroupId: 'cuid-workspace-source',
      };
      const fileOf = (content: string | null) =>
        mockArtifactStorageService.readFileIfExists.mockImplementation(
          (filePath: string) =>
            Promise.resolve(
              filePath.endsWith('01c_analysis_decision.json') ? content : null,
            ),
        );

      beforeEach(() => {
        mockPrismaService.manualNote.findMany.mockResolvedValue([]);
        mockPrismaService.generatedArtifact.findFirst.mockResolvedValue(null);
        mockPrismaService.promptRun.findUnique.mockResolvedValue(null);
        mockKnowledgeSourcesService.findActive.mockResolvedValue([]);
      });

      it('exposes policy fields of an experimental workspace', async () => {
        mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
          experimentalWorkspace,
        );
        mockArtifactsService.findByWorkspaceId.mockResolvedValue([
          mockVacancySourceArtifact,
          decisionArtifact(),
          analysisArtifact(),
        ]);
        fileOf(decisionJson);

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result).toMatchObject({
          analysisStrategy: AnalysisStrategy.c,
          contextLayout: ContextLayout.boundary,
          contextSourceSet: ContextSourceSet.assessment,
          forkedFromWorkspaceId: 'cuid-workspace-source',
        });
        expect(result?.analysisPolicy).toEqual({
          decision: 'maybe',
          score: 68,
          advisoryDecision: 'apply',
          advisoryDiffers: true,
          borderline: true,
          borderlineReasons: ['F: score 68 is within 3 points of 65'],
          manualReviewRequired: true,
          decidingRule: 'B2',
          openQuestions: [
            { condition: 'eligibility.remote_location', note: 'unclear' },
          ],
          policyVersion: 'adr-046@2026-11-26',
        });
        // The detail still carries its T4 field.
        expect(result?.sourcesChangedSinceAnalysis).toBe(false);
      });

      it('exposes no policy fields for a legacy workspace', async () => {
        mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
          mockWorkspace,
        );
        mockArtifactsService.findByWorkspaceId.mockResolvedValue([
          mockVacancySourceArtifact,
          { ...mockAnalysisJsonArtifact, promptRunId: 'pr-prompt-1' },
        ]);
        fileOf(null);

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.analysisStrategy).toBe(AnalysisStrategy.legacy);
        expect(result).not.toHaveProperty('analysisPolicy');
        expect(
          mockArtifactStorageService.readFileIfExists,
        ).not.toHaveBeenCalledWith(
          expect.stringContaining('01c_analysis_decision.json'),
        );
      });

      it('omits policy fields when 01c cannot be read', async () => {
        mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
          experimentalWorkspace,
        );
        const cases: Array<{
          artifacts: unknown[];
          content: string | null;
        }> = [
          // registered, but the file is missing
          {
            artifacts: [decisionArtifact(), analysisArtifact()],
            content: null,
          },
          // not JSON (its hash recorded as registered, so only the parse refuses)
          {
            artifacts: [
              decisionArtifact({ contentHash: sha256('{not json') }),
              analysisArtifact(),
            ],
            content: '{not json',
          },
          // JSON that fails the T1 validator
          {
            artifacts: [
              decisionArtifact({ contentHash: sha256('{"decision":"apply"}') }),
              analysisArtifact(),
            ],
            content: '{"decision":"apply"}',
          },
          // changed on disk after registration
          {
            artifacts: [decisionArtifact(), analysisArtifact()],
            content: decisionJson.replace('"maybe"', '"apply"'),
          },
          // the 01c of an attempt that did not complete: no 01, or a 01 of another run
          { artifacts: [decisionArtifact()], content: decisionJson },
          {
            artifacts: [decisionArtifact(), analysisArtifact('pr-other')],
            content: decisionJson,
          },
          // no 01c at all
          { artifacts: [analysisArtifact()], content: null },
        ];

        for (const { artifacts, content } of cases) {
          mockArtifactsService.findByWorkspaceId.mockResolvedValue(artifacts);
          fileOf(content);

          const result = await service.getWorkspaceDetail('cuid-workspace-1');

          expect(result?.id).toBe('cuid-workspace-1');
          expect(result).not.toHaveProperty('analysisPolicy');
          expect(result?.analysisStrategy).toBe(AnalysisStrategy.c);
        }
      });
    });
  });

  describe('appendManualNote', () => {
    it('creates a new ManualNote row for the workspace', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
        mockWorkspace,
      );
      const createdNote = {
        id: 'note-2',
        workspaceId: 'cuid-workspace-1',
        text: 'No commercial AWS experience, remove that.',
        isLegacy: false,
        createdAt: new Date('2026-08-27T10:00:00Z'),
      };
      mockPrismaService.manualNote.create.mockResolvedValue(createdNote);

      const result = await service.appendManualNote(
        'cuid-workspace-1',
        'No commercial AWS experience, remove that.',
      );

      expect(mockPrismaService.manualNote.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'cuid-workspace-1',
          text: 'No commercial AWS experience, remove that.',
        },
      });
      expect(result).toEqual(createdNote);
    });

    it('does not merge with previous notes — each note is its own row', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(
        mockWorkspace,
      );
      mockPrismaService.manualNote.create.mockResolvedValue({
        id: 'note-3',
        workspaceId: 'cuid-workspace-1',
        text: 'Second note.',
        isLegacy: false,
        createdAt: new Date('2026-08-27T10:05:00Z'),
      });

      const result = await service.appendManualNote(
        'cuid-workspace-1',
        'Second note.',
      );

      expect(result.text).toBe('Second note.');
      expect(mockPrismaService.manualNote.create).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      mockPrismaService.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(
        service.appendManualNote('nonexistent', 'Some note'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.manualNote.create).not.toHaveBeenCalled();
    });
  });
});
