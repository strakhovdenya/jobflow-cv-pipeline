import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { renderAtsCvTemplate } from './ats-cv-template-renderer';
import { buildCvDownloadFileName } from './cv-download-filename';
import { EffectiveCvContent } from './effective-cv-content';

const ATS_CV_EXPORT_HTML_FILE = '04_cv_export_ats.html';

@Injectable()
export class AtsHtmlRendererService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  // Renders the effective content built by buildEffectiveCvContent() — the same object the export
  // gate checked — so corrections are already applied and are not read again here.
  async renderToAtsHtml(
    workspaceId: string,
    effective: EffectiveCvContent,
  ): Promise<string> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const html = renderAtsCvTemplate(effective.content);

    const { filePath, hash } = await this.artifactStorage.writeFile(
      workspaceAbsPath,
      ATS_CV_EXPORT_HTML_FILE,
      html,
    );

    await this.artifactsService.register({
      workspaceId,
      artifactType: 'cv_export_ats_html',
      canonicalFileName: ATS_CV_EXPORT_HTML_FILE,
      filePath,
      storageRoot: workspace.storageRoot,
      contentHash: hash,
      origin: 'generated_by_export_service',
      mimeType: 'text/html',
      downloadFileName: buildCvDownloadFileName(
        workspace.company.companySlug,
        workspace.jobVacancy.roleSlug,
        { variant: 'ats', extension: 'html' },
      ),
    });

    return html;
  }
}
