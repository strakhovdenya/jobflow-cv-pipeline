import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EvidenceService } from './evidence.service';

const makeItem = (claimArea: string, category: string): EvidenceItem => ({
  id: `ei-${claimArea}`,
  claimArea,
  category,
  description: `Description for ${claimArea}`,
  notes: null,
  createdAt: new Date('2026-06-30T10:00:00Z'),
  updatedAt: new Date('2026-06-30T10:00:00Z'),
});

const allItems: EvidenceItem[] = [
  makeItem('Node.js', 'allowed'),
  makeItem('TypeScript', 'allowed'),
  makeItem('Azure Functions', 'allowed'),
  makeItem('PostgreSQL', 'allowed'),
  makeItem('NestJS', 'risky'),
  makeItem('Docker', 'risky'),
  makeItem('AI/RAG', 'risky'),
  makeItem('Kubernetes', 'unsupported'),
  makeItem('AWS', 'unsupported'),
];

const mockPrisma = {
  evidenceItem: {
    findMany: jest.fn(),
  },
};

describe('EvidenceService', () => {
  let service: EvidenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
    jest.clearAllMocks();
  });

  describe('findByCategory', () => {
    it('returns only items matching the requested category', async () => {
      const allowed = allItems.filter((i) => i.category === 'allowed');
      mockPrisma.evidenceItem.findMany.mockResolvedValue(allowed);

      const result = await service.findByCategory('allowed');

      expect(mockPrisma.evidenceItem.findMany).toHaveBeenCalledWith({
        where: { category: 'allowed' },
        orderBy: { claimArea: 'asc' },
      });
      expect(result).toHaveLength(4);
      expect(result.every((i) => i.category === 'allowed')).toBe(true);
    });

    it('returns risky items correctly', async () => {
      const risky = allItems.filter((i) => i.category === 'risky');
      mockPrisma.evidenceItem.findMany.mockResolvedValue(risky);

      const result = await service.findByCategory('risky');
      expect(result).toHaveLength(3);
      expect(result.map((i) => i.claimArea)).toContain('NestJS');
      expect(result.map((i) => i.claimArea)).toContain('AI/RAG');
    });

    it('returns empty array when no items match category', async () => {
      mockPrisma.evidenceItem.findMany.mockResolvedValue([]);
      const result = await service.findByCategory('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('returns all evidence items across all categories', async () => {
      mockPrisma.evidenceItem.findMany.mockResolvedValue(allItems);

      const result = await service.findAll();

      expect(result).toHaveLength(9);
      const categories = [...new Set(result.map((i) => i.category))];
      expect(categories).toContain('allowed');
      expect(categories).toContain('risky');
      expect(categories).toContain('unsupported');
    });
  });
});
