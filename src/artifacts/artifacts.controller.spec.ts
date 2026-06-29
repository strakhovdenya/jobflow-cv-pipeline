import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GeneratedArtifact } from '@prisma/client';
import * as fs from 'fs/promises';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';

jest.mock('fs/promises');
const fsMock = fs as jest.Mocked<typeof fs>;

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

describe('ArtifactsController', () => {
  let controller: ArtifactsController;
  let service: jest.Mocked<ArtifactsService>;

  beforeEach(async () => {
    const mockService = {
      findByWorkspaceId: jest.fn(),
      findById: jest.fn(),
      register: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtifactsController],
      providers: [{ provide: ArtifactsService, useValue: mockService }],
    }).compile();

    controller = module.get<ArtifactsController>(ArtifactsController);
    service = module.get(ArtifactsService);
    jest.clearAllMocks();
  });

  describe('GET /workspaces/:id/artifacts', () => {
    it('returns artifact list for workspace', async () => {
      service.findByWorkspaceId.mockResolvedValue([mockArtifact]);

      const result = await controller.findByWorkspace('ws-id-1');

      expect(service.findByWorkspaceId).toHaveBeenCalledWith('ws-id-1');
      expect(result).toHaveLength(1);
      expect(result[0].canonicalFileName).toBe('00_vacancy_source.txt');
    });

    it('returns empty array when workspace has no artifacts', async () => {
      service.findByWorkspaceId.mockResolvedValue([]);
      const result = await controller.findByWorkspace('ws-id-empty');
      expect(result).toHaveLength(0);
    });
  });

  describe('GET /artifacts/:id/download', () => {
    const mockRes = () => {
      const res: any = {};
      res.setHeader = jest.fn().mockReturnValue(res);
      res.send = jest.fn().mockReturnValue(res);
      return res;
    };

    it('throws NotFoundException when artifact not found in DB', async () => {
      service.findById.mockResolvedValue(null);
      await expect(
        controller.download('nonexistent', mockRes()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for path outside storageRoot', async () => {
      const maliciousArtifact: GeneratedArtifact = {
        ...mockArtifact,
        filePath: '/storage/applications/../../../etc/passwd',
        storageRoot: '/storage/applications',
      };
      service.findById.mockResolvedValue(maliciousArtifact);

      await expect(controller.download('art-id-1', mockRes())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when file missing on disk', async () => {
      service.findById.mockResolvedValue(mockArtifact);
      fsMock.access.mockRejectedValue(new Error('ENOENT'));

      await expect(controller.download('art-id-1', mockRes())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns file content with correct headers', async () => {
      service.findById.mockResolvedValue(mockArtifact);
      fsMock.access.mockResolvedValue(undefined);
      fsMock.readFile.mockResolvedValue('vacancy text content' as any);

      const res = mockRes();
      await controller.download('art-id-1', res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="00_vacancy_source.txt"',
      );
      expect(res.send).toHaveBeenCalledWith('vacancy text content');
    });
  });
});
