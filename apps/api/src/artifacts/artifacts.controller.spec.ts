import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService, ArtifactWithSlugs } from './artifacts.service';

jest.mock('fs/promises');
const fsMock = fs as jest.Mocked<typeof fs>;

const mockArtifact: ArtifactWithSlugs = {
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
  companySlug: 'Acme',
  roleSlug: 'Backend_Engineer',
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

    it('findByWorkspace omits storageRoot and filePath', async () => {
      service.findByWorkspaceId.mockResolvedValue([mockArtifact]);

      const result = await controller.findByWorkspace('ws-id-1');

      expect(result[0]).not.toHaveProperty('storageRoot');
      expect(result[0]).not.toHaveProperty('filePath');
      expect(result[0]).toMatchObject({
        id: 'art-id-1',
        canonicalFileName: '00_vacancy_source.txt',
      });
    });

    it('list returns effective downloadFileName', async () => {
      service.findByWorkspaceId.mockResolvedValue([
        mockArtifact,
        { ...mockArtifact, id: 'art-id-2', downloadFileName: 'registered.pdf' },
      ]);

      const result = await controller.findByWorkspace('ws-id-1');

      expect(result.map((item) => item.downloadFileName)).toEqual([
        'Strakhov_Denys_Acme_Backend_Engineer_VacancySource.txt',
        'registered.pdf',
      ]);
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
      const maliciousArtifact: ArtifactWithSlugs = {
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
      fsMock.readFile.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      await expect(controller.download('art-id-1', mockRes())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rethrows a non-ENOENT read error instead of reporting the file as missing', async () => {
      service.findById.mockResolvedValue(mockArtifact);
      const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      fsMock.readFile.mockRejectedValue(denied);

      await expect(controller.download('art-id-1', mockRes())).rejects.toBe(
        denied,
      );
    });

    const downloadWith = async (artifact: ArtifactWithSlugs) => {
      service.findById.mockResolvedValue(artifact);
      fsMock.readFile.mockResolvedValue(Buffer.from('x'));
      const res = mockRes();
      await controller.download('art-id-1', res);
      return res;
    };

    it('download still serves file by stored path', async () => {
      service.findById.mockResolvedValue(mockArtifact);
      fsMock.readFile.mockResolvedValue(Buffer.from('stored', 'utf-8'));

      const res = mockRes();
      await controller.download('art-id-1', res);

      expect(fsMock.readFile).toHaveBeenCalledWith(
        path.resolve(mockArtifact.filePath),
      );
      expect(res.send).toHaveBeenCalledWith(Buffer.from('stored', 'utf-8'));
    });

    it('returns file content with correct headers', async () => {
      service.findById.mockResolvedValue(mockArtifact);
      fsMock.readFile.mockResolvedValue(
        Buffer.from('vacancy text content', 'utf-8'),
      );

      const res = mockRes();
      await controller.download('art-id-1', res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="Strakhov_Denys_Acme_Backend_Engineer_VacancySource.txt"; filename*=UTF-8''Strakhov_Denys_Acme_Backend_Engineer_VacancySource.txt`,
      );
      expect(res.send).toHaveBeenCalledWith(
        Buffer.from('vacancy text content', 'utf-8'),
      );
    });

    it('download sets filename* for Cyrillic name', async () => {
      const res = await downloadWith({
        ...mockArtifact,
        downloadFileName: 'Strakhov_Denys_Яндекс_CV.pdf',
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="Strakhov_Denys________CV.pdf"; filename*=UTF-8''Strakhov_Denys_%D0%AF%D0%BD%D0%B4%D0%B5%D0%BA%D1%81_CV.pdf`,
      );
    });

    it('download keeps ASCII filename', async () => {
      const res = await downloadWith({
        ...mockArtifact,
        downloadFileName: 'Strakhov_Denys_Acme_CV.pdf',
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="Strakhov_Denys_Acme_CV.pdf"; filename*=UTF-8''Strakhov_Denys_Acme_CV.pdf`,
      );
    });

    const computedDisposition =
      'attachment; filename="Strakhov_Denys_Acme_Backend_Engineer_VacancySource.txt"; ' +
      "filename*=UTF-8''Strakhov_Denys_Acme_Backend_Engineer_VacancySource.txt";

    it('download uses computed name when downloadFileName is null', async () => {
      const res = await downloadWith({
        ...mockArtifact,
        downloadFileName: null,
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        computedDisposition,
      );
    });

    it('download treats empty downloadFileName as unset', async () => {
      const res = await downloadWith({ ...mockArtifact, downloadFileName: '' });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        computedDisposition,
      );
    });

    it('download keeps registered downloadFileName', async () => {
      const res = await downloadWith({
        ...mockArtifact,
        downloadFileName: 'registered.pdf',
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="registered.pdf"; filename*=UTF-8''registered.pdf`,
      );
    });

    it('download falls back to canonical name without workspace', async () => {
      const res = await downloadWith({
        ...mockArtifact,
        companySlug: null,
        roleSlug: null,
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="00_vacancy_source.txt"; filename*=UTF-8''00_vacancy_source.txt`,
      );
    });

    it('sends binary content unchanged (does not corrupt a non-UTF-8 byte sequence)', async () => {
      const pdfArtifact: ArtifactWithSlugs = {
        ...mockArtifact,
        canonicalFileName: 'Denys_Strakhov_Action1_Backend_Developer_CV.pdf',
        filePath:
          '/storage/applications/2026_06_29_Action1_Role/04_cv_export.pdf',
        mimeType: 'application/pdf',
      };
      service.findById.mockResolvedValue(pdfArtifact);
      // 0xFF/0xFE are invalid as standalone UTF-8 bytes and would be replaced
      // with U+FFFD if this file were ever read/re-encoded as 'utf-8' text.
      const binaryContent = Buffer.from([0x25, 0x50, 0x44, 0x46, 0xff, 0xfe]);
      fsMock.readFile.mockResolvedValue(binaryContent);

      const res = mockRes();
      await controller.download('art-id-1', res);

      expect(res.send).toHaveBeenCalledWith(binaryContent);
      const sentBuffer = res.send.mock.calls[0][0] as Buffer;
      expect(sentBuffer.equals(binaryContent)).toBe(true);
    });
  });
});
