import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceStatusService } from '../workspaces/workspace-status.service';
import { AtsHtmlRendererService } from './ats-html-renderer.service';
import { CandidateProfileGuardService } from './candidate-profile-guard.service';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import { buildCvDownloadFileName } from './cv-download-filename';
import { HtmlRendererService } from './html-renderer.service';
import { PdfExportService } from './pdf-export.service';

const CV_EXPORT_HTML_FILE = '04_cv_export.html';
const CV_EXPORT_PDF_FILE = '04_cv_export.pdf';
const CV_EXPORT_ATS_HTML_FILE = '04_cv_export_ats.html';
const CV_EXPORT_ATS_PDF_FILE = '04_cv_export_ats.pdf';

// Deliberately not an HttpException: an ATS render failure is a real export failure, so the
// workspace must still be moved to `failed`. The original error stays reachable through `cause`.
class AtsExportError extends Error {
  constructor(
    message: string,
    readonly cause: unknown,
  ) {
    super(message);
    this.name = 'AtsExportError';
  }
}

export class ExportCvResult {
  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ enum: WorkspaceStatus })
  status: WorkspaceStatus;

  @ApiProperty()
  htmlPath: string;

  @ApiProperty()
  pdfPath: string;

  @ApiProperty({
    description:
      'Absolute path to the ATS-optimized CV PDF (04_cv_export_ats.pdf)',
  })
  atsPdfPath: string;
}

@Injectable()
export class DocumentExportService {
  private readonly logger = new Logger(DocumentExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlRenderer: HtmlRendererService,
    private readonly pdfExport: PdfExportService,
    private readonly artifactsService: ArtifactsService,
    private readonly candidateProfileGuard: CandidateProfileGuardService,
    private readonly atsHtmlRenderer: AtsHtmlRendererService,
    private readonly workspaceStatus: WorkspaceStatusService,
  ) {}

  async exportCv(workspaceId: string): Promise<ExportCvResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const EXPORT_ALLOWED_STATUSES: WorkspaceStatus[] = [
      WorkspaceStatus.export_running,
      WorkspaceStatus.paused_before_export,
    ];

    if (!EXPORT_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — export requires status "export_running" or "paused_before_export"`,
      );
    }

    const profileGuardResult = this.candidateProfileGuard.check(
      CANDIDATE_PROFILE_CONFIG,
    );
    if (!profileGuardResult.passed) {
      throw new BadRequestException(
        `Export blocked: candidate-profile.config.ts contains placeholder data — ${profileGuardResult.issues.join('; ')}`,
      );
    }

    // Claim the export atomically so a second concurrent request is rejected with 409 instead
    // of rendering the PDFs twice. export_running is already the in-flight status (legacy entry
    // point per ADR-026), so a workspace that is already there needs no claim.
    if (workspace.status === WorkspaceStatus.paused_before_export) {
      await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.paused_before_export,
        WorkspaceStatus.export_running,
      );
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );
    const htmlPath = path.join(workspaceAbsPath, CV_EXPORT_HTML_FILE);
    const pdfPath = path.join(workspaceAbsPath, CV_EXPORT_PDF_FILE);

    try {
      await this.htmlRenderer.renderToHtml(workspaceId);
      await this.pdfExport.htmlFileToPdf(htmlPath, pdfPath);

      const pdfBuffer = await fs.readFile(pdfPath);
      const contentHash = createHash('sha256').update(pdfBuffer).digest('hex');

      await this.artifactsService.register({
        workspaceId,
        artifactType: 'cv_export_pdf',
        canonicalFileName: CV_EXPORT_PDF_FILE,
        filePath: pdfPath,
        storageRoot: workspace.storageRoot,
        contentHash,
        origin: 'generated_by_export_service',
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBuffer.byteLength,
        downloadFileName: buildCvDownloadFileName(
          workspace.company.companySlug,
          workspace.jobVacancy.roleSlug,
          { variant: 'design', extension: 'pdf' },
        ),
      });

      const atsHtmlPath = path.join(workspaceAbsPath, CV_EXPORT_ATS_HTML_FILE);
      const atsPdfPath = path.join(workspaceAbsPath, CV_EXPORT_ATS_PDF_FILE);
      try {
        await this.atsHtmlRenderer.renderToAtsHtml(workspaceId);
        await this.pdfExport.htmlFileToPdf(atsHtmlPath, atsPdfPath);
        const atsPdfBuffer = await fs.readFile(atsPdfPath);
        const atsContentHash = createHash('sha256')
          .update(atsPdfBuffer)
          .digest('hex');
        await this.artifactsService.register({
          workspaceId,
          artifactType: 'cv_export_ats_pdf',
          canonicalFileName: CV_EXPORT_ATS_PDF_FILE,
          filePath: atsPdfPath,
          storageRoot: workspace.storageRoot,
          contentHash: atsContentHash,
          origin: 'generated_by_export_service',
          mimeType: 'application/pdf',
          fileSizeBytes: atsPdfBuffer.byteLength,
          downloadFileName: buildCvDownloadFileName(
            workspace.company.companySlug,
            workspace.jobVacancy.roleSlug,
            { variant: 'ats', extension: 'pdf' },
          ),
        });
      } catch (atsError) {
        const originalMessage =
          atsError instanceof Error ? atsError.message : String(atsError);
        throw new AtsExportError(
          `Design CV export succeeded (04_cv_export.pdf registered), but ATS CV export failed: ${originalMessage}`,
          atsError,
        );
      }

      const updated = await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.export_running,
        WorkspaceStatus.cv_pdf_generated,
      );

      return {
        workspaceId: updated.id,
        status: updated.status,
        htmlPath,
        pdfPath,
        atsPdfPath,
      };
    } catch (error) {
      await this.markExportFailed(workspaceId);
      throw error;
    }
  }

  // Cleanup must never mask the export error that is being handled.
  private async markExportFailed(workspaceId: string): Promise<void> {
    try {
      await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.export_running,
        WorkspaceStatus.failed,
      );
    } catch (cleanupError) {
      this.logger.warn(
        `Could not mark export of workspace "${workspaceId}" as failed: ${
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError)
        }`,
      );
    }
  }
}
