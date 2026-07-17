import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RejectionsService } from './rejections.service';

const WORKSPACE_ID = 'ws-rejections-1';

const makeWorkspace = (status: WorkspaceStatus) => ({
  id: WORKSPACE_ID,
  status,
  storageRoot: '/storage',
  workspacePath: '2026.07.16_acme_backend_developer',
});

describe('RejectionsService', () => {
  let service: RejectionsService;
  let prismaMock: { applicationWorkspace: { findUnique: jest.Mock } };
  let artifactStorageMock: { writeFile: jest.Mock };
  let artifactsServiceMock: { register: jest.Mock };

  beforeEach(async () => {
    prismaMock = { applicationWorkspace: { findUnique: jest.fn() } };
    artifactStorageMock = { writeFile: jest.fn() };
    artifactsServiceMock = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RejectionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ArtifactStorageService, useValue: artifactStorageMock },
        { provide: ArtifactsService, useValue: artifactsServiceMock },
      ],
    }).compile();

    service = module.get<RejectionsService>(RejectionsService);
  });

  describe('saveRejectionText', () => {
    it('writes the file and registers the artifact when status is rejected', async () => {
      const workspace = makeWorkspace(WorkspaceStatus.rejected);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      artifactStorageMock.writeFile.mockResolvedValue({
        filePath:
          '/storage/2026.07.16_acme_backend_developer/rejection_feedback.md',
        hash: 'hash123',
      });
      artifactsServiceMock.register.mockResolvedValue({
        id: 'artifact-1',
        artifactType: 'rejection_feedback',
      });

      const result = await service.saveRejectionText(WORKSPACE_ID, {
        text: 'Thank you for applying, but the position was filled internally.',
      });

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('2026.07.16_acme_backend_developer'),
        'rejection_feedback.md',
        'Thank you for applying, but the position was filled internally.',
      );
      expect(artifactsServiceMock.register).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        artifactType: 'rejection_feedback',
        canonicalFileName: 'rejection_feedback.md',
        filePath:
          '/storage/2026.07.16_acme_backend_developer/rejection_feedback.md',
        storageRoot: '/storage',
        contentHash: 'hash123',
        origin: 'pasted',
        mimeType: 'text/markdown',
      });
      expect(result).toEqual({
        id: 'artifact-1',
        artifactType: 'rejection_feedback',
      });
    });

    it.each([
      WorkspaceStatus.applied,
      WorkspaceStatus.cv_pdf_generated,
      WorkspaceStatus.source_saved,
    ])(
      'throws BadRequestException when status is %s (not rejected)',
      async (status) => {
        prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
          makeWorkspace(status),
        );

        await expect(
          service.saveRejectionText(WORKSPACE_ID, { text: 'irrelevant' }),
        ).rejects.toThrow(BadRequestException);
        expect(artifactStorageMock.writeFile).not.toHaveBeenCalled();
        expect(artifactsServiceMock.register).not.toHaveBeenCalled();
      },
    );

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(
        service.saveRejectionText(WORKSPACE_ID, { text: 'irrelevant' }),
      ).rejects.toThrow(NotFoundException);
      expect(artifactStorageMock.writeFile).not.toHaveBeenCalled();
    });
  });
});
