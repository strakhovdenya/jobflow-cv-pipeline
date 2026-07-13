import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';

const PRE_PDF_CHECK_ALLOWED_STATUSES = [
  'cv_draft_ready',
  'paused_after_cv_draft',
];

export interface Prompt3WorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  roleTitleOriginal: string;
  workspacePath: string;
  storageRoot: string;
}

export interface Prompt3InputResult {
  promptText: string;
  inputContext: string;
  sourceSnapshot: string;
}

@Injectable()
export class Prompt3InputBuilderService {
  constructor(private readonly artifactStorage: ArtifactStorageService) {}

  async buildPrompt3Input(
    workspace: Prompt3WorkspaceContext,
    templateContent: string,
  ): Promise<Prompt3InputResult> {
    if (!PRE_PDF_CHECK_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Prompt 3 can only run when workspace status is cv_draft_ready or paused_after_cv_draft. Current status: ${workspace.status}`,
      );
    }

    const workspaceAbsPath = path.join(
      workspace.storageRoot,
      workspace.workspacePath,
    );

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

    const analysisText =
      await this.readOptionalAnalysisArtifact(workspaceAbsPath);

    const inputContext = [
      `=== WORKSPACE METADATA ===`,
      `Company: ${workspace.companyNameOriginal}`,
      `Role: ${workspace.roleTitleOriginal}`,
      ``,
      `=== TARGETED CV CONTENT (02_targeted_cv_content.json) ===`,
      cvContentText,
      ``,
      `=== PROMPT 1 ANALYSIS (context only) ===`,
      analysisText ?? '[No vacancy analysis artifact available]',
    ].join('\n');

    const snapshot = {
      cvContentPath,
    };

    return {
      promptText: templateContent,
      inputContext,
      sourceSnapshot: JSON.stringify(snapshot),
    };
  }

  private async readOptionalAnalysisArtifact(
    workspaceAbsPath: string,
  ): Promise<string | undefined> {
    const jsonPath = path.join(workspaceAbsPath, '01_vacancy_analysis.json');
    try {
      return await this.artifactStorage.readFile(jsonPath);
    } catch {
      return undefined;
    }
  }
}
