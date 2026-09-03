import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DocumentExportService,
  ExportCvResult,
} from './document-export.service';

const CV_EXPORT_PDF_FILE = '04_cv_export.pdf';
const CV_EXPORT_ATS_PDF_FILE = '04_cv_export_ats.pdf';

interface DownloadableWorkspace {
  company: { companySlug: string };
  jobVacancy: { roleSlug: string };
}

@ApiTags('document-export')
@Controller('workspaces')
export class DocumentExportController {
  constructor(
    private readonly documentExportService: DocumentExportService,
    private readonly artifactsService: ArtifactsService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Export the approved CV draft to PDF' })
  @ApiCreatedResponse({ type: ExportCvResult })
  @Post(':id/export-cv')
  async exportCv(@Param('id') id: string) {
    return this.documentExportService.exportCv(id);
  }

  @ApiOperation({ summary: 'Download the generated CV PDF for a workspace' })
  @Get(':id/download-cv')
  async downloadCv(@Param('id') id: string, @Res() res: Response) {
    const { content, downloadName } = await this.resolveDownloadablePdf(
      id,
      CV_EXPORT_PDF_FILE,
      (workspace) =>
        `Denys_Strakhov_${workspace.company.companySlug}_${workspace.jobVacancy.roleSlug}_CV.pdf`,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName}"`,
    );
    res.send(content);
  }

  @ApiOperation({
    summary: 'Download the ATS-optimized CV PDF for a workspace',
  })
  @Get(':id/download-cv-ats')
  async downloadCvAts(@Param('id') id: string, @Res() res: Response) {
    const { content, downloadName } = await this.resolveDownloadablePdf(
      id,
      CV_EXPORT_ATS_PDF_FILE,
      (workspace) =>
        `Denys_Strakhov_${workspace.company.companySlug}_${workspace.jobVacancy.roleSlug}_CV_ATS.pdf`,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName}"`,
    );
    res.send(content);
  }

  /**
   * Shared by downloadCv/downloadCvAts: resolves the latest registered artifact matching
   * canonicalFileName, enforces STORAGE_ROOT path-safety, and reads its content. Kept as a
   * single copy so a future fix to the path-traversal guard only needs to happen once.
   */
  private async resolveDownloadablePdf(
    id: string,
    canonicalFileName: string,
    buildDownloadName: (workspace: DownloadableWorkspace) => string,
  ): Promise<{ content: Buffer; downloadName: string }> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }

    const artifacts = await this.artifactsService.findByWorkspaceId(id);
    const matchingArtifacts = artifacts.filter(
      (artifact) => artifact.canonicalFileName === canonicalFileName,
    );
    const artifact = matchingArtifacts[matchingArtifacts.length - 1];

    if (!artifact) {
      throw new NotFoundException(
        `No "${canonicalFileName}" artifact found for workspace "${id}"`,
      );
    }

    const resolvedRoot = path.resolve(artifact.storageRoot);
    const resolvedFile = path.resolve(artifact.filePath);
    const rootWithSep = resolvedRoot.endsWith(path.sep)
      ? resolvedRoot
      : resolvedRoot + path.sep;

    if (
      resolvedFile !== resolvedRoot &&
      !resolvedFile.startsWith(rootWithSep)
    ) {
      throw new ForbiddenException('Access to this path is not allowed');
    }

    try {
      await fs.access(resolvedFile);
    } catch {
      throw new NotFoundException(
        `File not found on disk: "${artifact.canonicalFileName}"`,
      );
    }

    const content = await fs.readFile(resolvedFile);
    const downloadName = buildDownloadName(workspace);

    return { content, downloadName };
  }
}
