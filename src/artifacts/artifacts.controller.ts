import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactsService } from './artifacts.service';

@ApiTags('artifacts')
@Controller()
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @ApiOperation({ summary: 'List artifacts generated for a workspace' })
  @Get('workspaces/:id/artifacts')
  async findByWorkspace(@Param('id') workspaceId: string) {
    return this.artifactsService.findByWorkspaceId(workspaceId);
  }

  @ApiOperation({ summary: 'Download a generated artifact by id' })
  @Get('artifacts/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const artifact = await this.artifactsService.findById(id);
    if (!artifact) {
      throw new NotFoundException(`Artifact "${id}" not found`);
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
    const downloadName =
      artifact.downloadFileName ?? artifact.canonicalFileName;

    res.setHeader(
      'Content-Type',
      artifact.mimeType ?? 'text/plain; charset=utf-8',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName}"`,
    );
    res.send(content);
  }
}
