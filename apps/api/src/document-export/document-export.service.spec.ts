import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AtsHtmlRendererService } from './ats-html-renderer.service';
import { CandidateProfileGuardService } from './candidate-profile-guard.service';
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
  let candidateProfileGuardMock: jest.Mocked<CandidateProfileGuardService>;
  let atsHtmlRendererMock: jest.Mocked<AtsHtmlRendererService>;

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

    candidateProfileGuardMock = {
      check: jest.fn().mockReturnValue({ passed: true, issues: [] }),
    } as unknown as jest.Mocked<CandidateProfileGuardService>;

    atsHtmlRendererMock = {
      renderToAtsHtml: jest.fn().mockResolvedValue('<html></html>'),
    } as unknown as jest.Mocked<AtsHtmlRendererService>;

    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('%PDF-1.4'));

    service = new DocumentExportService(
      prismaMock as unknown as PrismaService,
      htmlRendererMock,
      pdfExportMock,
      artifactsMock,
      candidateProfileGuardMock,
      atsHtmlRendererMock,
    );
  });

  it('has no AiProvider/AI_PROVIDER dependency — deterministic export only', () => {
    expect(DocumentExportService.length).toBe(6);
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

  it('rejects with BadRequestException and never renders when the candidate profile guard fails', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    candidateProfileGuardMock.check.mockReturnValue({
      passed: false,
      issues: ['Placeholder marker found in: "Placeholder University"'],
    });

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(htmlRendererMock.renderToHtml).not.toHaveBeenCalled();
    expect(pdfExportMock.htmlFileToPdf).not.toHaveBeenCalled();
    expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
  });

  it('calls HtmlRendererService before PdfExportService (design), AtsHtmlRendererService before PdfExportService (ATS), in order', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });

    const callOrder: string[] = [];
    htmlRendererMock.renderToHtml.mockImplementation(async () => {
      callOrder.push('design-html');
      return '<html></html>';
    });
    atsHtmlRendererMock.renderToAtsHtml.mockImplementation(async () => {
      callOrder.push('ats-html');
      return '<html></html>';
    });
    pdfExportMock.htmlFileToPdf.mockImplementation(async () => {
      callOrder.push('pdf');
    });

    await service.exportCv(WORKSPACE_ID);

    // design html → design pdf → ats html → ats pdf
    expect(callOrder).toEqual(['design-html', 'pdf', 'ats-html', 'pdf']);
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

  it('calls AtsHtmlRendererService.renderToAtsHtml and registers cv_export_ats_pdf artifact', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    await service.exportCv(WORKSPACE_ID);

    expect(atsHtmlRendererMock.renderToAtsHtml).toHaveBeenCalledWith(
      WORKSPACE_ID,
    );
    expect(artifactsMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        artifactType: 'cv_export_ats_pdf',
        canonicalFileName: '04_cv_export_ats.pdf',
        origin: 'generated_by_export_service',
        mimeType: 'application/pdf',
        storageRoot: '/storage',
      }),
    );
  });

  it('ATS PDF export does not create an AiRun — deterministic export, ADR-012', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    await service.exportCv(WORKSPACE_ID);

    // ATS artifact registered with export-service origin (no AiRun linkage)
    expect(artifactsMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'cv_export_ats_pdf',
        origin: 'generated_by_export_service',
      }),
    );
    // Only one prisma.update call (cv_pdf_generated) — no AiRun-related DB writes
    expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
      where: { id: WORKSPACE_ID },
      data: { status: WorkspaceStatus.cv_pdf_generated },
    });
  });

  it('exportCv() result contains atsPdfPath pointing to 04_cv_export_ats.pdf', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    const result = await service.exportCv(WORKSPACE_ID);

    expect(result.atsPdfPath).toContain('04_cv_export_ats.pdf');
  });

  it('when design export succeeds but ATS export fails, status becomes failed and error names design success and ATS failure cause', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    prismaMock.applicationWorkspace.update.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.failed,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf
      .mockResolvedValueOnce(undefined) // design PDF succeeds
      .mockRejectedValueOnce(new Error('puppeteer ATS crash')); // ATS PDF fails

    const err = await service.exportCv(WORKSPACE_ID).catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      'Design CV export succeeded (04_cv_export.pdf registered)',
    );
    expect((err as Error).message).toContain('puppeteer ATS crash');
    expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
      where: { id: WORKSPACE_ID },
      data: { status: WorkspaceStatus.failed },
    });
  });
});
