import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';

const FINAL_CHECK_ALLOWED_STATUSES = [
  'cv_pdf_generated',
  'cover_letter_generated',
];

export interface Prompt5WorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  roleTitleOriginal: string;
  workspacePath: string;
  storageRoot: string;
}

export interface Prompt5InputResult {
  promptText: string;
  inputContext: string;
  sourceSnapshot: string;
}

@Injectable()
export class Prompt5InputBuilderService {
  constructor(private readonly artifactStorage: ArtifactStorageService) {}

  async buildPrompt5Input(
    workspace: Prompt5WorkspaceContext,
    templateContent: string,
  ): Promise<Prompt5InputResult> {
    if (!FINAL_CHECK_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Prompt 5 can only run when workspace status is cv_pdf_generated or cover_letter_generated. Current status: ${workspace.status}`,
      );
    }

    const workspaceAbsPath = path.join(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    // cover_letter_generated is a terminal WorkspaceStatus (see workspace-status.service.ts
    // TRANSITIONS) — running final check from there does not move status away from the allowed
    // list, so the usual "status left the allowed list" one-shot lock doesn't apply. Guard against
    // re-running with an explicit artifact check instead.
    if (workspace.status === 'cover_letter_generated') {
      const existingFinalCheckJson = await this.readOptionalArtifact(
        workspaceAbsPath,
        '05_final_check.json',
      );
      if (existingFinalCheckJson !== undefined) {
        throw new BadRequestException(
          'Final check has already been completed for this workspace.',
        );
      }
    }

    const cvExportHtmlPath = path.join(workspaceAbsPath, '04_cv_export.html');

    let cvExportHtml: string;
    try {
      cvExportHtml = await this.artifactStorage.readFile(cvExportHtmlPath);
    } catch {
      throw new BadRequestException(
        'Exported CV artifact not found (04_cv_export.html). Export the CV first.',
      );
    }

    const cvContentPath = path.join(
      workspaceAbsPath,
      '02_targeted_cv_content.json',
    );

    let cvContentText: string;
    try {
      cvContentText = await this.artifactStorage.readFile(cvContentPath);
    } catch {
      throw new BadRequestException(
        'Targeted CV content artifact not found (02_targeted_cv_content.json). Generate CV content first.',
      );
    }

    const analysisText = await this.readOptionalArtifact(
      workspaceAbsPath,
      '01_vacancy_analysis.json',
    );

    const prePdfCheckText = await this.readOptionalArtifact(
      workspaceAbsPath,
      '03_pre_pdf_check.json',
    );

    const inputContext = [
      `=== WORKSPACE METADATA ===`,
      `Company: ${workspace.companyNameOriginal}`,
      `Role: ${workspace.roleTitleOriginal}`,
      ``,
      `=== EXPORTED CV (04_cv_export.html) ===`,
      cvExportHtml,
      ``,
      `=== TARGETED CV CONTENT (02_targeted_cv_content.json) ===`,
      cvContentText,
      ``,
      `=== PROMPT 1 ANALYSIS (context only) ===`,
      analysisText ?? '[No vacancy analysis artifact available]',
      ``,
      `=== PROMPT 3 PRE-PDF CHECK (context only) ===`,
      prePdfCheckText ?? '[No pre-PDF check artifact available]',
    ].join('\n');

    const snapshot = {
      cvExportHtmlPath,
      cvContentPath,
    };

    return {
      promptText: templateContent,
      inputContext,
      sourceSnapshot: JSON.stringify(snapshot),
    };
  }

  private async readOptionalArtifact(
    workspaceAbsPath: string,
    fileName: string,
  ): Promise<string | undefined> {
    const filePath = path.join(workspaceAbsPath, fileName);
    try {
      return await this.artifactStorage.readFile(filePath);
    } catch {
      return undefined;
    }
  }
}
