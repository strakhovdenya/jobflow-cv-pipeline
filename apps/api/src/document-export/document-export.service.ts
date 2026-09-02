import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AtsHtmlRendererService } from './ats-html-renderer.service';
import { CandidateProfileGuardService } from './candidate-profile-guard.service';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import { HtmlRendererService } from './html-renderer.service';
import { PdfExportService } from './pdf-export.service';

const CV_EXPORT_HTML_FILE = '04_cv_export.html';
const CV_EXPORT_PDF_FILE = '04_cv_export.pdf';
const CV_EXPORT_ATS_HTML_FILE = '04_cv_export_ats.html';
const CV_EXPORT_ATS_PDF_FILE = '04_cv_export_ats.pdf';

export interface ExportCvResult {
  workspaceId: string;
  status: WorkspaceStatus;
  htmlPath: string;
  pdfPath: string;
}

@Injectable()
export class DocumentExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlRenderer: HtmlRendererService,
    private readonly pdfExport: PdfExportService,
    private readonly artifactsService: ArtifactsService,
    private readonly candidateProfileGuard: CandidateProfileGuardService,
    private readonly atsHtmlRenderer: AtsHtmlRendererService,
  ) {}

  async exportCv(workspaceId: string): Promise<ExportCvResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
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
        });
      } catch (atsError) {
        const originalMessage =
          atsError instanceof Error ? atsError.message : String(atsError);
        throw new Error(
          `Design CV export succeeded (04_cv_export.pdf registered), but ATS CV export failed: ${originalMessage}`,
        );
      }

      const updated = await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: { status: WorkspaceStatus.cv_pdf_generated },
      });

      return {
        workspaceId: updated.id,
        status: updated.status,
        htmlPath,
        pdfPath,
      };
    } catch (error) {
      await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: { status: WorkspaceStatus.failed },
      });
      throw error;
    }
  }
}
