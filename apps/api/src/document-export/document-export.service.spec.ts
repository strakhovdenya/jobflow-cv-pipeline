import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceStatusService } from '../workspaces/workspace-status.service';
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
    company: { companySlug: 'FakeCompany' },
    jobVacancy: { roleSlug: 'Backend_Developer' },
  };
}

describe('DocumentExportService', () => {
  let service: DocumentExportService;
  let prismaMock: {
    applicationWorkspace: { findUnique: jest.Mock };
  };
  let workspaceStatusMock: { transition: jest.Mock };
  let htmlRendererMock: jest.Mocked<HtmlRendererService>;
  let pdfExportMock: jest.Mocked<PdfExportService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let candidateProfileGuardMock: jest.Mocked<CandidateProfileGuardService>;
  let atsHtmlRendererMock: jest.Mocked<AtsHtmlRendererService>;

  beforeEach(() => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
      },
    };
    workspaceStatusMock = { transition: jest.fn() };

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
      workspaceStatusMock as unknown as WorkspaceStatusService,
    );
  });

  it('has no AiProvider/AI_PROVIDER dependency — deterministic export only', () => {
    expect(DocumentExportService.length).toBe(7);
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
    expect(workspaceStatusMock.transition).not.toHaveBeenCalled();
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
    expect(workspaceStatusMock.transition).not.toHaveBeenCalled();
  });

  it('calls HtmlRendererService before PdfExportService (design), AtsHtmlRendererService before PdfExportService (ATS), in order', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
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
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    const result = await service.exportCv(WORKSPACE_ID);

    expect(result.status).toBe(WorkspaceStatus.cv_pdf_generated);
    expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.cv_pdf_generated,
    );
  });

  it('transitions workspace status to failed and rethrows when PdfExportService throws', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.failed,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    const pdfError = new Error('Puppeteer launch failed');
    pdfExportMock.htmlFileToPdf.mockRejectedValue(pdfError);

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBe(pdfError);

    expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.failed,
    );
  });

  it('registers the PDF as a GeneratedArtifact with export-service origin', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
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

  it('sets downloadFileName on the design PDF artifact at registration time', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    await service.exportCv(WORKSPACE_ID);

    expect(artifactsMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'cv_export_pdf',
        canonicalFileName: '04_cv_export.pdf',
        downloadFileName: 'Strakhov_Denys_FakeCompany_Backend_Developer_CV.pdf',
      }),
    );
  });

  it('sets downloadFileName on the ATS PDF artifact at registration time', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

    await service.exportCv(WORKSPACE_ID);

    expect(artifactsMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'cv_export_ats_pdf',
        canonicalFileName: '04_cv_export_ats.pdf',
        downloadFileName:
          'Strakhov_Denys_FakeCompany_Backend_Developer_CV_ATS.pdf',
      }),
    );
  });

  it('calls AtsHtmlRendererService.renderToAtsHtml and registers cv_export_ats_pdf artifact', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
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
    workspaceStatusMock.transition.mockResolvedValue({
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
    // Only the export claim and the final status write — no AiRun-related DB writes
    expect(workspaceStatusMock.transition).toHaveBeenCalledTimes(2);
    expect(workspaceStatusMock.transition).toHaveBeenLastCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.cv_pdf_generated,
    );
  });

  it('exportCv() result contains atsPdfPath pointing to 04_cv_export_ats.pdf', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
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
    workspaceStatusMock.transition.mockResolvedValue({
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
    expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.failed,
    );
  });

  describe('atomic export claim', () => {
    it('claims paused_before_export -> export_running before rendering anything', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
      );
      workspaceStatusMock.transition.mockResolvedValue({
        id: WORKSPACE_ID,
        status: WorkspaceStatus.cv_pdf_generated,
      });
      htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
      pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

      await service.exportCv(WORKSPACE_ID);

      expect(workspaceStatusMock.transition).toHaveBeenNthCalledWith(
        1,
        WORKSPACE_ID,
        WorkspaceStatus.paused_before_export,
        WorkspaceStatus.export_running,
      );
      expect(
        workspaceStatusMock.transition.mock.invocationCallOrder[0],
      ).toBeLessThan(htmlRendererMock.renderToHtml.mock.invocationCallOrder[0]);
    });

    it('does not claim again when the workspace is already export_running (legacy entry point)', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
      );
      workspaceStatusMock.transition.mockResolvedValue({
        id: WORKSPACE_ID,
        status: WorkspaceStatus.cv_pdf_generated,
      });
      htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
      pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);

      await service.exportCv(WORKSPACE_ID);

      expect(workspaceStatusMock.transition).toHaveBeenCalledTimes(1);
    });

    it('rejects a concurrent second export with 409 and renders nothing', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
      );
      workspaceStatusMock.transition.mockRejectedValueOnce(
        new ConflictException('changed by another request'),
      );

      await expect(service.exportCv(WORKSPACE_ID)).rejects.toThrow(
        ConflictException,
      );

      expect(htmlRendererMock.renderToHtml).not.toHaveBeenCalled();
      expect(pdfExportMock.htmlFileToPdf).not.toHaveBeenCalled();
      expect(workspaceStatusMock.transition).toHaveBeenCalledTimes(1);
    });
  });

  it('rethrows the original export error even when marking the workspace failed also fails', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    const pdfError = new Error('Puppeteer launch failed');
    pdfExportMock.htmlFileToPdf.mockRejectedValue(pdfError);
    workspaceStatusMock.transition.mockRejectedValue(new Error('db down'));

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBe(pdfError);
  });
});
