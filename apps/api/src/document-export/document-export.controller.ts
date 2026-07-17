import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentExportService } from './document-export.service';

const CV_EXPORT_PDF_FILE = '04_cv_export.pdf';

@ApiTags('document-export')
@Controller('workspaces')
export class DocumentExportController {
  constructor(
    private readonly documentExportService: DocumentExportService,
    private readonly artifactsService: ArtifactsService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiOperation({ summary: 'Export the approved CV draft to PDF' })
  @Post(':id/export-cv')
  async exportCv(@Param('id') id: string) {
    return this.documentExportService.exportCv(id);
  }

  @ApiOperation({ summary: 'Download the generated CV PDF for a workspace' })
  @Get(':id/download-cv')
  async downloadCv(@Param('id') id: string, @Res() res: Response) {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }

    const artifacts = await this.artifactsService.findByWorkspaceId(id);
    const pdfArtifacts = artifacts.filter(
      (artifact) => artifact.canonicalFileName === CV_EXPORT_PDF_FILE,
    );
    const pdfArtifact = pdfArtifacts[pdfArtifacts.length - 1];

    if (!pdfArtifact) {
      throw new NotFoundException(
        `No "${CV_EXPORT_PDF_FILE}" artifact found for workspace "${id}"`,
      );
    }

    const resolvedRoot = path.resolve(pdfArtifact.storageRoot);
    const resolvedFile = path.resolve(pdfArtifact.filePath);
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
        `File not found on disk: "${pdfArtifact.canonicalFileName}"`,
      );
    }

    const content = await fs.readFile(resolvedFile);
    const downloadName = `Denys_Strakhov_${workspace.company.companySlug}_${workspace.jobVacancy.roleSlug}_CV.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName}"`,
    );
    res.send(content);
  }
}
