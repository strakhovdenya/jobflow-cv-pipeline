import { Test, TestingModule } from '@nestjs/testing';
import { GeneratedArtifact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArtifactsService, RegisterArtifactDto } from './artifacts.service';

const mockArtifact: GeneratedArtifact = {
  id: 'art-id-1',
  workspaceId: 'ws-id-1',
  promptRunId: null,
  artifactType: 'vacancy_source',
  canonicalFileName: '00_vacancy_source.txt',
  filePath:
    '/storage/applications/2026_06_29_Action1_Role/00_vacancy_source.txt',
  storageRoot: '/storage/applications',
  contentHash: 'abc123hash',
  isLatest: true,
  version: 1,
  origin: 'pasted',
  status: 'ready',
  mimeType: null,
  fileSizeBytes: null,
  downloadFileName: null,
  createdAt: new Date('2026-06-29T10:00:00Z'),
  updatedAt: new Date('2026-06-29T10:00:00Z'),
};

const mockPrisma = {
  generatedArtifact: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
};

const validDto: RegisterArtifactDto = {
  workspaceId: 'ws-id-1',
  artifactType: 'vacancy_source',
  canonicalFileName: '00_vacancy_source.txt',
  filePath:
    '/storage/applications/2026_06_29_Action1_Role/00_vacancy_source.txt',
  storageRoot: '/storage/applications',
  contentHash: 'abc123hash',
  origin: 'pasted',
};

describe('ArtifactsService', () => {
  let service: ArtifactsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ArtifactsService>(ArtifactsService);
    jest.clearAllMocks();
    mockPrisma.generatedArtifact.findFirst.mockResolvedValue(null);
  });

  describe('register', () => {
    it('creates a GeneratedArtifact record', async () => {
      mockPrisma.generatedArtifact.create.mockResolvedValue(mockArtifact);

      const result = await service.register(validDto);

      expect(mockPrisma.generatedArtifact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws-id-1',
          artifactType: 'vacancy_source',
          canonicalFileName: '00_vacancy_source.txt',
          contentHash: 'abc123hash',
          origin: 'pasted',
          isLatest: true,
        }),
      });
      expect(result.id).toBe('art-id-1');
      expect(result.artifactType).toBe('vacancy_source');
    });

    it('defaults isLatest to true when not provided', async () => {
      mockPrisma.generatedArtifact.create.mockResolvedValue(mockArtifact);
      await service.register(validDto);

      const callArg = mockPrisma.generatedArtifact.create.mock.calls[0][0];
      expect(callArg.data.isLatest).toBe(true);
    });

    it('assigns version 1 and skips updateMany when no prior artifact of this type exists', async () => {
      mockPrisma.generatedArtifact.findFirst.mockResolvedValue(null);
      mockPrisma.generatedArtifact.create.mockResolvedValue(mockArtifact);

      await service.register(validDto);

      expect(mockPrisma.generatedArtifact.updateMany).not.toHaveBeenCalled();
      const callArg = mockPrisma.generatedArtifact.create.mock.calls[0][0];
      expect(callArg.data.version).toBe(1);
    });

    it('marks the previous latest artifact of the same type as false and bumps the version', async () => {
      const previousLatest: GeneratedArtifact = {
        ...mockArtifact,
        id: 'art-id-old',
        version: 1,
        isLatest: true,
      };
      mockPrisma.generatedArtifact.findFirst.mockResolvedValue(previousLatest);
      mockPrisma.generatedArtifact.create.mockResolvedValue({
        ...mockArtifact,
        id: 'art-id-new',
        version: 2,
      });

      await service.register(validDto);

      expect(mockPrisma.generatedArtifact.updateMany).toHaveBeenCalledWith({
        where: {
          workspaceId: validDto.workspaceId,
          artifactType: validDto.artifactType,
          isLatest: true,
        },
        data: { isLatest: false },
      });
      const callArg = mockPrisma.generatedArtifact.create.mock.calls[0][0];
      expect(callArg.data.version).toBe(2);
      expect(callArg.data.isLatest).toBe(true);
    });

    it('does not affect artifacts of a different type in the same workspace', async () => {
      mockPrisma.generatedArtifact.findFirst.mockResolvedValue(null);
      mockPrisma.generatedArtifact.create.mockResolvedValue(mockArtifact);

      await service.register({
        ...validDto,
        artifactType: 'vacancy_analysis_md',
      });

      expect(mockPrisma.generatedArtifact.findFirst).toHaveBeenCalledWith({
        where: {
          workspaceId: validDto.workspaceId,
          artifactType: 'vacancy_analysis_md',
          isLatest: true,
        },
        orderBy: { version: 'desc' },
      });
      expect(mockPrisma.generatedArtifact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findByWorkspaceId', () => {
    it('returns all artifacts for a workspace ordered by createdAt asc', async () => {
      mockPrisma.generatedArtifact.findMany.mockResolvedValue([mockArtifact]);

      const result = await service.findByWorkspaceId('ws-id-1');

      expect(mockPrisma.generatedArtifact.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-id-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].canonicalFileName).toBe('00_vacancy_source.txt');
    });

    it('returns empty array when workspace has no artifacts', async () => {
      mockPrisma.generatedArtifact.findMany.mockResolvedValue([]);
      const result = await service.findByWorkspaceId('ws-id-none');
      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('returns artifact when found', async () => {
      mockPrisma.generatedArtifact.findUnique.mockResolvedValue(mockArtifact);
      const result = await service.findById('art-id-1');
      expect(result?.id).toBe('art-id-1');
    });

    it('returns null when not found', async () => {
      mockPrisma.generatedArtifact.findUnique.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });
});
