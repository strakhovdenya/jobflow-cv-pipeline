import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { validateTargetedCvContentJson } from '../pipeline/schemas/targeted-cv-content.schema';
import {
  PrePdfCheckCorrection,
  validatePrePdfCheckJson,
} from '../pipeline/schemas/pre-pdf-check.schema';
import { renderCvTemplate } from './cv-template-renderer';
import { mapPrompt2OutputToCvContent } from './prompt2-to-cv-content.mapper';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';

const CV_CONTENT_JSON_FILE = '02_targeted_cv_content.json';
const PRE_PDF_CHECK_JSON_FILE = '03_pre_pdf_check.json';
const CV_EXPORT_HTML_FILE = '04_cv_export.html';

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

@Injectable()
export class HtmlRendererService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  async renderToHtml(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const cvContentPath = path.join(workspaceAbsPath, CV_CONTENT_JSON_FILE);
    const rawCvContent = await this.artifactStorage.readFile(cvContentPath);
    const cvValidation = validateTargetedCvContentJson(rawCvContent);
    if (!cvValidation.success || !cvValidation.data) {
      throw new Error(
        `Invalid ${CV_CONTENT_JSON_FILE}: ${cvValidation.error ?? 'unknown validation error'}`,
      );
    }

    const cvContent = mapPrompt2OutputToCvContent(
      cvValidation.data,
      CANDIDATE_PROFILE_CONFIG,
    );

    const corrections = await this.readCorrections(workspaceAbsPath);

    const html = renderCvTemplate(cvContent, corrections);

    const { filePath, hash } = await this.artifactStorage.writeFile(
      workspaceAbsPath,
      CV_EXPORT_HTML_FILE,
      html,
    );

    await this.artifactsService.register({
      workspaceId,
      artifactType: 'cv_export_html',
      canonicalFileName: CV_EXPORT_HTML_FILE,
      filePath,
      storageRoot: workspace.storageRoot,
      contentHash: hash,
      origin: 'generated_by_export_service',
      mimeType: 'text/html',
    });

    return html;
  }

  private async readCorrections(
    workspaceAbsPath: string,
  ): Promise<PrePdfCheckCorrection[] | undefined> {
    const prePdfCheckPath = path.join(
      workspaceAbsPath,
      PRE_PDF_CHECK_JSON_FILE,
    );

    let rawPrePdfCheck: string;
    try {
      rawPrePdfCheck = await this.artifactStorage.readFile(prePdfCheckPath);
    } catch (error) {
      if (isEnoent(error)) {
        return undefined;
      }
      throw error;
    }

    const validation = validatePrePdfCheckJson(rawPrePdfCheck);
    if (!validation.success || !validation.data) {
      throw new Error(
        `Invalid ${PRE_PDF_CHECK_JSON_FILE}: ${validation.error ?? 'unknown validation error'}`,
      );
    }

    return validation.data.corrections;
  }
}
