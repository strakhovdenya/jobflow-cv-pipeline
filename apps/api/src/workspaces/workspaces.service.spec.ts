import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ApplicationWorkspace,
  Company,
  GeneratedArtifact,
  JobVacancy,
  Prisma,
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
  createWorkspaceFolder: jest.fn(),
  saveVacancySource: jest.fn(),
  removeWorkspaceFolder: jest.fn(),
  readFile: jest.fn(),
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

  it('registers the vacancy_source artifact with mimeType text/plain', async () => {
    mockArtifactStorageService.createWorkspaceFolder.mockResolvedValue({
      absolutePath:
        '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
      relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
    });
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
    );
  });

  it('creates company, vacancy and workspace inside a single $transaction', async () => {
    mockArtifactStorageService.createWorkspaceFolder.mockResolvedValue({
      absolutePath:
        '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
      relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
    });
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
    mockArtifactStorageService.createWorkspaceFolder.mockResolvedValue({
      absolutePath:
        '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
      relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
    });
    mockArtifactStorageService.saveVacancySource.mockResolvedValue({
      filePath:
        '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      hash: 'sha256-abc123',
    });
    mockCompanyService.create.mockResolvedValue(mockCompany);
    mockVacancyService.create.mockResolvedValue(mockVacancy);
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`workspaceSlug`)',
      { code: 'P2002', clientVersion: '5.0.0' },
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

  it('removes the created folder and rethrows on a non-conflict transaction failure', async () => {
    mockArtifactStorageService.createWorkspaceFolder.mockResolvedValue({
      absolutePath:
        '/tmp/test-storage/2026_06_29_Action1_Backend_Developer_Node_js',
      relativePath: '2026_06_29_Action1_Backend_Developer_Node_js',
    });
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
        mockArtifactStorageService.readFile.mockImplementation((p: string) => {
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
          return Promise.reject(new Error('ENOENT'));
        });

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
        mockArtifactStorageService.readFile.mockImplementation((p: string) => {
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
          return Promise.reject(new Error('ENOENT'));
        });

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
        mockArtifactStorageService.readFile.mockRejectedValue(
          new Error('ENOENT'),
        );

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([]);
      });

      it('returns an empty array when an artifact exists but is not valid JSON, without throwing', async () => {
        mockArtifactStorageService.readFile.mockImplementation((p: string) => {
          if (p.endsWith('02_targeted_cv_content.json')) {
            return Promise.resolve('not valid json{{{');
          }
          return Promise.reject(new Error('ENOENT'));
        });

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([]);
      });

      it('ignores manual_note_forced_claims when it is missing from an otherwise-valid artifact', async () => {
        mockArtifactStorageService.readFile.mockImplementation((p: string) => {
          if (p.endsWith('02_targeted_cv_content.json')) {
            return Promise.resolve(JSON.stringify({ headline: 'Backend' }));
          }
          return Promise.reject(new Error('ENOENT'));
        });

        const result = await service.getWorkspaceDetail('cuid-workspace-1');

        expect(result?.manualNoteForcedClaims).toEqual([]);
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
