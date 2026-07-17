import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeSource } from '@prisma/client';
import { HashService } from '../artifacts/hash.service';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeSourcesService } from './knowledge-sources.service';

const mockSource: KnowledgeSource = {
  id: 'ks-id-1',
  filePath: '/knowledge/master_profile.md',
  sourceType: 'master_profile',
  isActive: true,
  contentHash: 'abc123hash',
  versionLabel: 'v1.0',
  importedAt: new Date('2026-06-30T10:00:00Z'),
  createdAt: new Date('2026-06-30T10:00:00Z'),
  updatedAt: new Date('2026-06-30T10:00:00Z'),
};

const mockPrisma = {
  knowledgeSource: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockHashService = {
  hashFile: jest.fn(),
};

describe('KnowledgeSourcesService', () => {
  let service: KnowledgeSourcesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeSourcesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HashService, useValue: mockHashService },
      ],
    }).compile();

    service = module.get<KnowledgeSourcesService>(KnowledgeSourcesService);
    jest.clearAllMocks();
  });

  describe('importSource', () => {
    it('creates a knowledge source record with computed hash', async () => {
      mockHashService.hashFile.mockResolvedValue('abc123hash');
      mockPrisma.knowledgeSource.create.mockResolvedValue(mockSource);

      const result = await service.importSource({
        filePath: '/knowledge/master_profile.md',
        sourceType: 'master_profile',
        versionLabel: 'v1.0',
      });

      expect(mockHashService.hashFile).toHaveBeenCalledWith(
        '/knowledge/master_profile.md',
      );
      expect(mockPrisma.knowledgeSource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filePath: '/knowledge/master_profile.md',
          sourceType: 'master_profile',
          contentHash: 'abc123hash',
          versionLabel: 'v1.0',
        }),
      });
      expect(result.id).toBe('ks-id-1');
    });

    it('sets versionLabel to null when not provided', async () => {
      mockHashService.hashFile.mockResolvedValue('abc123hash');
      mockPrisma.knowledgeSource.create.mockResolvedValue({
        ...mockSource,
        versionLabel: null,
      });

      await service.importSource({
        filePath: '/knowledge/tech_stack.md',
        sourceType: 'tech_stack_matrix',
      });

      const callArg = mockPrisma.knowledgeSource.create.mock.calls[0][0];
      expect(callArg.data.versionLabel).toBeNull();
    });
  });

  describe('activate', () => {
    it('sets isActive to true', async () => {
      mockPrisma.knowledgeSource.findUnique.mockResolvedValue(mockSource);
      mockPrisma.knowledgeSource.update.mockResolvedValue({
        ...mockSource,
        isActive: true,
      });

      const result = await service.activate('ks-id-1');

      expect(mockPrisma.knowledgeSource.update).toHaveBeenCalledWith({
        where: { id: 'ks-id-1' },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException when source not found', async () => {
      mockPrisma.knowledgeSource.findUnique.mockResolvedValue(null);
      await expect(service.activate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      mockPrisma.knowledgeSource.findUnique.mockResolvedValue(mockSource);
      mockPrisma.knowledgeSource.update.mockResolvedValue({
        ...mockSource,
        isActive: false,
      });

      const result = await service.deactivate('ks-id-1');

      expect(mockPrisma.knowledgeSource.update).toHaveBeenCalledWith({
        where: { id: 'ks-id-1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when source not found', async () => {
      mockPrisma.knowledgeSource.findUnique.mockResolvedValue(null);
      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActive', () => {
    it('returns only active sources ordered by importedAt desc', async () => {
      mockPrisma.knowledgeSource.findMany.mockResolvedValue([mockSource]);

      const result = await service.findActive();

      expect(mockPrisma.knowledgeSource.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { importedAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('returns empty array when no active sources', async () => {
      mockPrisma.knowledgeSource.findMany.mockResolvedValue([]);
      const result = await service.findActive();
      expect(result).toHaveLength(0);
    });
  });
});
