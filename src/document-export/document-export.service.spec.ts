import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentExportService } from './document-export.service';
import { HtmlRendererService } from './html-renderer.service';
import { PdfExportService } from './pdf-export.service';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';

const WORKSPACE_ID = 'ws-export-1';

function makeWorkspaceRecord(status: WorkspaceStatus) {
  return {
    id: WORKSPACE_ID,
    storageRoot: '/storage',
    workspacePath: '2026_01_01_FakeCompany_Backend',
    status,
  };
}

describe('DocumentExportService', () => {
  let service: DocumentExportService;
  let prismaMock: {
    applicationWorkspace: { findUnique: jest.Mock; update: jest.Mock };
  };
  let htmlRendererMock: jest.Mocked<HtmlRendererService>;
  let pdfExportMock: jest.Mocked<PdfExportService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;

  beforeEach(() => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    htmlRendererMock = {
      renderToHtml: jest.fn(),
    } as unknown as jest.Mocked<HtmlRendererService>;

    pdfExportMock = {
      htmlFileToPdf: jest.fn(),
    } as unknown as jest.Mocked<PdfExportService>;

    artifactsMock = {
      register: jest.fn(),
    } as unknown as jest.Mocked<ArtifactsService>;

    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('%PDF-1.4'));

    service = new DocumentExportService(
      prismaMock as unknown as PrismaService,
      htmlRendererMock,
      pdfExportMock,
      artifactsMock,
    );
  });

  it('has no AiProvider/AI_PROVIDER dependency — deterministic export only', () => {
    expect(DocumentExportService.length).toBe(4);
  });

  it('throws NotFoundException when workspace does not exist', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(htmlRendererMock.renderToHtml).not.toHaveBeenCalled();
  });

  it('rejects with BadRequestException (400) when status is not export_running', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_after_cv_draft) as never,
    );

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(htmlRendererMock.renderToHtml).not.toHaveBeenCalled();
    expect(pdfExportMock.htmlFileToPdf).not.toHaveBeenCalled();
    expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
  });

  it('calls HtmlRendererService before PdfExportService, in order', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });

    const callOrder: string[] = [];
    htmlRendererMock.renderToHtml.mockImplementation(async () => {
      callOrder.push('html');
      return '<html></html>';
    });
    pdfExportMock.htmlFileToPdf.mockImplementation(async () => {
      callOrder.push('pdf');
    });

    await service.exportCv(WORKSPACE_ID);

    expect(callOrder).toEqual(['html', 'pdf']);
  });

  it('transitions workspace status to cv_pdf_generated after a successful export', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    const result = await service.exportCv(WORKSPACE_ID);

    expect(result.status).toBe(WorkspaceStatus.cv_pdf_generated);
    expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
      where: { id: WORKSPACE_ID },
      data: { status: WorkspaceStatus.cv_pdf_generated },
    });
  });

  it('transitions workspace status to failed and rethrows when PdfExportService throws', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.failed,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    const pdfError = new Error('Puppeteer launch failed');
    pdfExportMock.htmlFileToPdf.mockRejectedValue(pdfError);

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBe(pdfError);

    expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
      where: { id: WORKSPACE_ID },
      data: { status: WorkspaceStatus.failed },
    });
  });

  it('registers the PDF as a GeneratedArtifact with export-service origin', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    await service.exportCv(WORKSPACE_ID);

    expect(artifactsMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        canonicalFileName: '04_cv_export.pdf',
        origin: 'generated_by_export_service',
        mimeType: 'application/pdf',
        storageRoot: '/storage',
      }),
    );
  });
});
