import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '@prisma/client';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';

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

const mockPrismaService = {
  company: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    jest.clearAllMocks();
  });

  it('creates a company and returns the record', async () => {
    mockPrismaService.company.create.mockResolvedValue(mockCompany);

    const result = await service.create({
      nameOriginal: 'Action1',
      companySlug: 'Action1',
      sourceType: 'manual',
    });

    expect(mockPrismaService.company.create).toHaveBeenCalledWith({
      data: {
        nameOriginal: 'Action1',
        companySlug: 'Action1',
        sourceType: 'manual',
      },
    });
    expect(result.id).toBe('cuid-company-1');
    expect(result.companySlug).toBe('Action1');
  });

  it('finds a company by id', async () => {
    mockPrismaService.company.findUnique.mockResolvedValue(mockCompany);

    const result = await service.findById('cuid-company-1');

    expect(mockPrismaService.company.findUnique).toHaveBeenCalledWith({
      where: { id: 'cuid-company-1' },
    });
    expect(result).toEqual(mockCompany);
  });

  it('returns null when company is not found', async () => {
    mockPrismaService.company.findUnique.mockResolvedValue(null);

    const result = await service.findById('nonexistent');

    expect(result).toBeNull();
  });
});
