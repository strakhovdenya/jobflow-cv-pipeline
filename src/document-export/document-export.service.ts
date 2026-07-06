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
import { HtmlRendererService } from './html-renderer.service';
import { PdfExportService } from './pdf-export.service';

const CV_EXPORT_HTML_FILE = '04_cv_export.html';
const CV_EXPORT_PDF_FILE = '04_cv_export.pdf';

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
  ) {}

  async exportCv(workspaceId: string): Promise<ExportCvResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    if (workspace.status !== WorkspaceStatus.export_running) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — export requires status "export_running"`,
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
