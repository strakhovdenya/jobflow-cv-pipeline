import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import * as path from 'path';
import { FAKE_PROMPT2_JSON } from '../ai/providers/fake.provider';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';
import { PrismaService } from '../prisma/prisma.service';
import { StepFailureService } from '../workspaces/step-failure.service';
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
const ARCHIVED_PROJECT = 'Retired Demo Tool';
const ELIGIBLE_PROJECT = 'Sample Portfolio Service';
const ELIGIBLE_CREDENTIAL = 'Sample Skill Badge';
const INELIGIBLE_CREDENTIAL = 'Sample Lab';

// Synthetic snapshot in the shape EvidenceGuard writes to overclaiming_check.registry_snapshot.
function makeRegistrySnapshot() {
  return {
    schema: 'registry-snapshot/v1',
    projects: [
      {
        title: ELIGIBLE_PROJECT,
        aliases: [],
        status: 'active',
        cvEligible: true,
        placement: 'selected_projects',
      },
      {
        title: ARCHIVED_PROJECT,
        aliases: ['retired-demo'],
        status: 'archived',
        cvEligible: false,
        placement: 'none',
      },
    ],
    credentials: [
      {
        title: ELIGIBLE_CREDENTIAL,
        aliases: [],
        type: 'skill_badge',
        status: 'earned',
        cvEligible: true,
      },
      {
        title: INELIGIBLE_CREDENTIAL,
        aliases: [],
        type: 'lab',
        status: 'completed',
        cvEligible: false,
      },
    ],
    acceptedForced: { projects: [], credentials: [] },
  };
}

// A Prompt 2 draft as the guard leaves it: registry_violations empty, snapshot stored.
function makeDraft(
  edit: (draft: TargetedCvContentOutput) => void = () => undefined,
): TargetedCvContentOutput {
  const draft = JSON.parse(
    JSON.stringify(FAKE_PROMPT2_JSON),
  ) as TargetedCvContentOutput;
  draft.cv_content.selected_projects[0].title = ELIGIBLE_PROJECT;
  draft.cv_content.certifications = [
    { title: ELIGIBLE_CREDENTIAL, include: true, reason: 'relevant' },
  ];
  draft.overclaiming_check = {
    critical_issues: [],
    warnings: [],
    needs_evidence: [],
    registry_violations: [],
    registry_snapshot: makeRegistrySnapshot(),
  };
  edit(draft);
  return draft;
}

function makePrePdfCheck(fieldPath: string, suggestedText: string): string {
  return JSON.stringify({
    schema_version: '1.0',
    workspace_id: WORKSPACE_ID,
    readiness: 'ready_with_minor_edits',
    corrections: [
      {
        field_path: fieldPath,
        suggested_text: suggestedText,
        severity: 'warning',
        reason: 'Wording.',
      },
    ],
    quality_score: 80,
    export_blocked: false,
    overall_notes: 'Minor edits.',
  });
}

function enoent(): NodeJS.ErrnoException {
  const error = new Error('ENOENT') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  return error;
}

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
  let stepFailureMock: { record: jest.Mock; clear: jest.Mock };
  let htmlRendererMock: jest.Mocked<HtmlRendererService>;
  let pdfExportMock: jest.Mocked<PdfExportService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let candidateProfileGuardMock: jest.Mocked<CandidateProfileGuardService>;
  let atsHtmlRendererMock: jest.Mocked<AtsHtmlRendererService>;
  let artifactStorageMock: { readFile: jest.Mock; writeFile: jest.Mock };
  // Workspace artifacts by file name, served through artifactStorageMock.readFile.
  let workspaceFiles: Record<string, string>;

  beforeEach(() => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
      },
    };
    workspaceStatusMock = { transition: jest.fn() };
    stepFailureMock = {
      record: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
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

    workspaceFiles = {
      '02_targeted_cv_content.json': JSON.stringify(makeDraft()),
    };
    artifactStorageMock = {
      readFile: jest.fn(async (absolutePath: string) => {
        const name = path.basename(absolutePath);
        if (!(name in workspaceFiles)) throw enoent();
        return workspaceFiles[name];
      }),
      writeFile: jest.fn(async (folder: string, fileName: string) => ({
        filePath: path.join(folder, fileName),
        hash: `hash-${fileName}`,
      })),
    };

    service = new DocumentExportService(
      prismaMock as unknown as PrismaService,
      htmlRendererMock,
      pdfExportMock,
      artifactsMock,
      candidateProfileGuardMock,
      atsHtmlRendererMock,
      workspaceStatusMock as unknown as WorkspaceStatusService,
      stepFailureMock as unknown as StepFailureService,
      artifactStorageMock as unknown as ArtifactStorageService,
    );
  });

  it('has no AiProvider/AI_PROVIDER dependency — deterministic export only', () => {
    expect(DocumentExportService.length).toBe(9);
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

  it('returns to paused_before_export when export fails', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.paused_before_export,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    const pdfError = new Error('Puppeteer launch failed');
    pdfExportMock.htmlFileToPdf.mockRejectedValue(pdfError);

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBe(pdfError);

    expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.paused_before_export,
    );
    expect(stepFailureMock.record).toHaveBeenCalledWith(
      WORKSPACE_ID,
      'export',
      pdfError,
    );
  });

  it('records no step error when the rollback itself fails', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf.mockRejectedValue(new Error('boom'));
    workspaceStatusMock.transition.mockRejectedValue(new Error('db down'));

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toThrow('boom');

    expect(stepFailureMock.record).not.toHaveBeenCalled();
  });

  it('retry export after rollback succeeds', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
    });
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    pdfExportMock.htmlFileToPdf
      .mockRejectedValueOnce(new Error('Puppeteer launch failed'))
      .mockResolvedValue(undefined);

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toThrow(
      'Puppeteer launch failed',
    );
    const result = await service.exportCv(WORKSPACE_ID);

    expect(result.status).toBe(WorkspaceStatus.cv_pdf_generated);
    expect(stepFailureMock.clear).toHaveBeenCalledTimes(2);
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
      htmlRendererMock.renderToHtml.mock.calls[0][1],
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

  it('when design export succeeds but ATS export fails, status rolls back and error names design success and ATS failure cause', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
    );
    workspaceStatusMock.transition.mockResolvedValue({
      id: WORKSPACE_ID,
      status: WorkspaceStatus.paused_before_export,
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
    expect((err as Error as Error & { cause: unknown }).cause).toEqual(
      new Error('puppeteer ATS crash'),
    );
    expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.paused_before_export,
    );
  });

  it('still rolls the claimed workspace back (never stranding it in export_running) when rendering throws an HttpException, and rethrows it', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    const notFound = new NotFoundException(
      'Missing 02_targeted_cv_content.json',
    );
    htmlRendererMock.renderToHtml.mockRejectedValue(notFound);

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBe(notFound);

    expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
      WORKSPACE_ID,
      WorkspaceStatus.export_running,
      WorkspaceStatus.paused_before_export,
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

  it('rethrows the original export error even when rolling the workspace back also fails', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
    );
    htmlRendererMock.renderToHtml.mockResolvedValue('<html></html>');
    const pdfError = new Error('Puppeteer launch failed');
    pdfExportMock.htmlFileToPdf.mockRejectedValue(pdfError);
    workspaceStatusMock.transition.mockRejectedValue(new Error('db down'));

    await expect(service.exportCv(WORKSPACE_ID)).rejects.toBe(pdfError);
  });

  // ─── Registry export gate (before the claim) ─────────────────────────────────

  describe('registry export gate', () => {
    // Real renderers over the mocked storage: the gate and both renderers get the same
    // effective content, and a blocked export must write no HTML at all.
    let gatedService: DocumentExportService;

    beforeEach(() => {
      const storage = artifactStorageMock as unknown as ArtifactStorageService;
      const prisma = prismaMock as unknown as PrismaService;
      gatedService = new DocumentExportService(
        prisma,
        new HtmlRendererService(prisma, storage, artifactsMock),
        pdfExportMock,
        artifactsMock,
        candidateProfileGuardMock,
        new AtsHtmlRendererService(prisma, storage, artifactsMock),
        workspaceStatusMock as unknown as WorkspaceStatusService,
        stepFailureMock as unknown as StepFailureService,
        storage,
      );
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspaceRecord(WorkspaceStatus.paused_before_export) as never,
      );
      workspaceStatusMock.transition.mockResolvedValue({
        id: WORKSPACE_ID,
        status: WorkspaceStatus.cv_pdf_generated,
      });
      pdfExportMock.htmlFileToPdf.mockResolvedValue(undefined);
    });

    const writtenHtml = (fileName: string): string => {
      const call = artifactStorageMock.writeFile.mock.calls.find(
        (args: unknown[]) => args[1] === fileName,
      ) as [string, string, string] | undefined;
      if (call === undefined) throw new Error(`${fileName} was not written`);
      return call[2];
    };

    const exportError = async (): Promise<BadRequestException> => {
      const error: unknown = await gatedService
        .exportCv(WORKSPACE_ID)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(BadRequestException);
      return error as BadRequestException;
    };

    // Rejected before the claim: status untouched, no HTML/PDF/ATS file written or registered.
    const expectNothingExported = (): void => {
      expect(workspaceStatusMock.transition).not.toHaveBeenCalled();
      expect(stepFailureMock.clear).not.toHaveBeenCalled();
      expect(stepFailureMock.record).not.toHaveBeenCalled();
      expect(artifactStorageMock.writeFile).not.toHaveBeenCalled();
      expect(pdfExportMock.htmlFileToPdf).not.toHaveBeenCalled();
      expect(artifactsMock.register).not.toHaveBeenCalled();
    };

    it('blocks export before claim when registry violations exist', async () => {
      workspaceFiles['02_targeted_cv_content.json'] = JSON.stringify(
        makeDraft((draft) => {
          draft.cv_content.selected_projects[0].title = ARCHIVED_PROJECT;
        }),
      );

      const error = await exportError();

      expect(error.message).toContain(
        `selected_projects[0].title: project "${ARCHIVED_PROJECT}" is excluded by the portfolio registry (status: archived, cvEligible: false)`,
      );
      expect(error.message).toContain('Regenerate the CV draft');
      expectNothingExported();
    });

    it('blocks export when the registry snapshot is missing', async () => {
      workspaceFiles['02_targeted_cv_content.json'] = JSON.stringify(
        makeDraft((draft) => {
          delete draft.overclaiming_check.registry_snapshot;
          delete draft.overclaiming_check.registry_violations;
        }),
      );

      const error = await exportError();

      expect(error.message).toContain(
        'the CV draft has no valid registry snapshot',
      );
      expect(error.message).toContain('Regenerate the CV draft');
      expectNothingExported();
    });

    it('blocks export when the registry snapshot is malformed', async () => {
      workspaceFiles['02_targeted_cv_content.json'] = JSON.stringify(
        makeDraft((draft) => {
          draft.overclaiming_check.registry_snapshot = {
            ...makeRegistrySnapshot(),
            projects: 'all allowed',
          };
        }),
      );

      const error = await exportError();

      expect(error.message).toContain('no valid registry snapshot');
      expectNothingExported();
    });

    it('blocks export before claim when the draft is not valid JSON', async () => {
      workspaceFiles['02_targeted_cv_content.json'] = '{ not json';

      const error = await exportError();

      expect(error.message).toContain('Invalid 02_targeted_cv_content.json');
      expectNothingExported();
    });

    it('blocks export before claim when the draft file is missing', async () => {
      delete workspaceFiles['02_targeted_cv_content.json'];

      const error = await exportError();

      expect(error.message).toContain('the CV draft file does not exist');
      expectNothingExported();
    });

    it('returns a legacy export_running workspace to paused_before_export when the gate refuses', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspaceRecord(WorkspaceStatus.export_running) as never,
      );
      workspaceFiles['02_targeted_cv_content.json'] = JSON.stringify(
        makeDraft((draft) => {
          delete draft.overclaiming_check.registry_snapshot;
        }),
      );

      const error = await exportError();

      expect(error.message).toContain('no valid registry snapshot');
      expect(workspaceStatusMock.transition).toHaveBeenCalledTimes(1);
      expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
        WORKSPACE_ID,
        WorkspaceStatus.export_running,
        WorkspaceStatus.paused_before_export,
      );
      expect(stepFailureMock.record).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'export',
        error,
      );
      expect(artifactStorageMock.writeFile).not.toHaveBeenCalled();
      expect(pdfExportMock.htmlFileToPdf).not.toHaveBeenCalled();
      expect(artifactsMock.register).not.toHaveBeenCalled();
    });

    it('exports when registry violations are empty', async () => {
      const result = await gatedService.exportCv(WORKSPACE_ID);

      expect(result.status).toBe(WorkspaceStatus.cv_pdf_generated);
      expect(workspaceStatusMock.transition).toHaveBeenNthCalledWith(
        1,
        WORKSPACE_ID,
        WorkspaceStatus.paused_before_export,
        WorkspaceStatus.export_running,
      );
      for (const fileName of ['04_cv_export.html', '04_cv_export_ats.html']) {
        const html = writtenHtml(fileName);
        expect(html).toContain(ELIGIBLE_PROJECT);
        expect(html).toContain(ELIGIBLE_CREDENTIAL);
        expect(html).toContain(FAKE_PROMPT2_JSON.cv_content.summary[0]);
      }
      expect(artifactsMock.register).toHaveBeenCalledWith(
        expect.objectContaining({ artifactType: 'cv_export_pdf' }),
      );
      expect(artifactsMock.register).toHaveBeenCalledWith(
        expect.objectContaining({ artifactType: 'cv_export_ats_pdf' }),
      );
    });

    it('blocks export when a Prompt 3 correction introduces an archived project', async () => {
      workspaceFiles['03_pre_pdf_check.json'] = makePrePdfCheck(
        'summary[0]',
        `Backend developer who built ${ARCHIVED_PROJECT} for job search automation.`,
      );

      const error = await exportError();

      expect(error.message).toContain(
        `summary[0]: names archived project "${ARCHIVED_PROJECT}"`,
      );
      expect(error.message).toContain('Regenerate the CV draft');
      expect(error.message).toContain('re-run or skip the pre-PDF check');
      expectNothingExported();
    });

    it('blocks export when a Prompt 3 correction introduces an ineligible credential', async () => {
      workspaceFiles['03_pre_pdf_check.json'] = makePrePdfCheck(
        'certifications[0]',
        INELIGIBLE_CREDENTIAL,
      );

      const error = await exportError();

      expect(error.message).toContain(
        `certifications[0]: credential "${INELIGIBLE_CREDENTIAL}" is not CV-eligible in the credential registry (type: lab, status: completed)`,
      );
      expectNothingExported();
    });

    it('blocks export when a Prompt 3 correction renames a project to an archived one', async () => {
      workspaceFiles['03_pre_pdf_check.json'] = makePrePdfCheck(
        'selected_projects[0].title',
        ARCHIVED_PROJECT,
      );

      const error = await exportError();

      expect(error.message).toContain(
        `selected_projects[0].title: project "${ARCHIVED_PROJECT}" is excluded`,
      );
      expectNothingExported();
    });

    it('exports a valid Prompt 3 correction', async () => {
      const corrected = 'Backend developer focused on reliable Node.js APIs.';
      workspaceFiles['03_pre_pdf_check.json'] = makePrePdfCheck(
        'summary[0]',
        corrected,
      );

      const result = await gatedService.exportCv(WORKSPACE_ID);

      expect(result.status).toBe(WorkspaceStatus.cv_pdf_generated);
      for (const fileName of ['04_cv_export.html', '04_cv_export_ats.html']) {
        const html = writtenHtml(fileName);
        expect(html).toContain(corrected);
        expect(html).not.toContain(FAKE_PROMPT2_JSON.cv_content.summary[0]);
      }
      expect(pdfExportMock.htmlFileToPdf).toHaveBeenCalledTimes(2);
    });

    it('reads each workspace artifact once and renders the checked content in both renderers', async () => {
      await gatedService.exportCv(WORKSPACE_ID);

      const readNames = artifactStorageMock.readFile.mock.calls.map(
        (args: unknown[]) => path.basename(args[0] as string),
      );
      expect(readNames).toEqual([
        '02_targeted_cv_content.json',
        '03_pre_pdf_check.json',
      ]);
    });
  });
});
