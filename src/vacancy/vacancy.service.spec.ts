import { Test, TestingModule } from '@nestjs/testing';
import { VacancyService } from './vacancy.service';
import { PrismaService } from '../prisma/prisma.service';

const mockVacancy = {
  id: 'cuid-vacancy-1',
  companyId: 'cuid-company-1',
  roleTitleOriginal: 'Backend Developer Node.js',
  roleSlug: 'Backend_Developer_Node_js',
  sourceUrl: null,
  languageDetected: 'en',
  locationText: null,
  remoteType: 'remote',
  employmentType: 'full_time',
  seniority: 'senior',
  vacancyTextPath:
    'storage/applications/2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
  vacancyTextHash: 'sha256-abc123',
  vacancyTextSizeBytes: 1024,
  sourceFormat: 'pasted_text',
  originalImportedFileName: null,
  createdAt: new Date('2026-06-29'),
  updatedAt: new Date('2026-06-29'),
};

const mockPrismaService = {
  jobVacancy: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('VacancyService', () => {
  let service: VacancyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VacancyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VacancyService>(VacancyService);
    jest.clearAllMocks();
  });

  it('creates a vacancy linked to a company and returns the record', async () => {
    mockPrismaService.jobVacancy.create.mockResolvedValue(mockVacancy);

    const result = await service.create({
      roleTitleOriginal: 'Backend Developer Node.js',
      roleSlug: 'Backend_Developer_Node_js',
      vacancyTextPath:
        'storage/applications/2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
      vacancyTextHash: 'sha256-abc123',
      company: { connect: { id: 'cuid-company-1' } },
    });

    expect(mockPrismaService.jobVacancy.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('cuid-vacancy-1');
    expect(result.roleSlug).toBe('Backend_Developer_Node_js');
    expect(result.companyId).toBe('cuid-company-1');
  });

  it('finds a vacancy by id', async () => {
    mockPrismaService.jobVacancy.findUnique.mockResolvedValue(mockVacancy);

    const result = await service.findById('cuid-vacancy-1');

    expect(mockPrismaService.jobVacancy.findUnique).toHaveBeenCalledWith({
      where: { id: 'cuid-vacancy-1' },
    });
    expect(result).toEqual(mockVacancy);
  });

  it('returns null when vacancy is not found', async () => {
    mockPrismaService.jobVacancy.findUnique.mockResolvedValue(null);

    const result = await service.findById('nonexistent');

    expect(result).toBeNull();
  });
});
