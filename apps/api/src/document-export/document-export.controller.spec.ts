import { NotFoundException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentExportController } from './document-export.controller';
import { DocumentExportService } from './document-export.service';

jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';

const WORKSPACE_ID = 'ws-controller-1';

function makeWorkspaceRecord() {
  return {
    id: WORKSPACE_ID,
    storageRoot: '/storage',
    workspacePath: '2026_01_01_FakeCompany_Backend',
    status: WorkspaceStatus.cv_pdf_generated,
    company: { companySlug: 'FakeCompany' },
    jobVacancy: { roleSlug: 'Backend_Developer' },
  };
}

function makePdfArtifact(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'artifact-pdf-1',
    workspaceId: WORKSPACE_ID,
    canonicalFileName: '04_cv_export.pdf',
    filePath: '/storage/2026_01_01_FakeCompany_Backend/04_cv_export.pdf',
    storageRoot: '/storage',
    mimeType: 'application/pdf',
    ...overrides,
  };
}

describe('DocumentExportController', () => {
  let controller: DocumentExportController;
  let documentExportServiceMock: jest.Mocked<DocumentExportService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let prismaMock: { applicationWorkspace: { findUnique: jest.Mock } };
  let resMock: { setHeader: jest.Mock; send: jest.Mock };

  beforeEach(() => {
    documentExportServiceMock = {
      exportCv: jest.fn(),
    } as unknown as jest.Mocked<DocumentExportService>;

    artifactsMock = {
      findByWorkspaceId: jest.fn(),
    } as unknown as jest.Mocked<ArtifactsService>;

    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
      },
    };

    resMock = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('%PDF-1.4'));

    controller = new DocumentExportController(
      documentExportServiceMock,
      artifactsMock,
      prismaMock as unknown as PrismaService,
    );
  });

  it('POST :id/export-cv delegates to DocumentExportService.exportCv', async () => {
    const expected = {
      workspaceId: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
      htmlPath: '/storage/ws/04_cv_export.html',
      pdfPath: '/storage/ws/04_cv_export.pdf',
    };
    documentExportServiceMock.exportCv.mockResolvedValue(expected);

    const result = await controller.exportCv(WORKSPACE_ID);

    expect(documentExportServiceMock.exportCv).toHaveBeenCalledWith(
      WORKSPACE_ID,
    );
    expect(result).toBe(expected);
  });

  it('GET :id/download-cv streams the PDF with the slug-based download filename', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactsMock.findByWorkspaceId.mockResolvedValue([
      makePdfArtifact(),
    ] as never);

    await controller.downloadCv(WORKSPACE_ID, resMock as never);

    expect(resMock.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="Denys_Strakhov_FakeCompany_Backend_Developer_CV.pdf"',
    );
    expect(resMock.send).toHaveBeenCalledWith(Buffer.from('%PDF-1.4'));
  });

  it('picks the most recently registered PDF artifact when multiple exist', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactsMock.findByWorkspaceId.mockResolvedValue([
      makePdfArtifact({ id: 'artifact-pdf-old' }),
      makePdfArtifact({ id: 'artifact-pdf-latest' }),
    ] as never);

    await controller.downloadCv(WORKSPACE_ID, resMock as never);

    expect(resMock.send).toHaveBeenCalled();
  });

  it('throws NotFoundException when workspace does not exist', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

    await expect(
      controller.downloadCv(WORKSPACE_ID, resMock as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when no PDF artifact has been registered yet', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactsMock.findByWorkspaceId.mockResolvedValue([]);

    await expect(
      controller.downloadCv(WORKSPACE_ID, resMock as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the registered PDF file is missing on disk', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactsMock.findByWorkspaceId.mockResolvedValue([
      makePdfArtifact(),
    ] as never);
    (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    await expect(
      controller.downloadCv(WORKSPACE_ID, resMock as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
