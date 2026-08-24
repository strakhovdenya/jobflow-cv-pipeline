import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';

const PRE_PDF_CHECK_ALLOWED_STATUSES = ['pre_pdf_check_ready'];

export interface Prompt3WorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  roleTitleOriginal: string;
  workspacePath: string;
  storageRoot: string;
}

export interface Prompt3SourceSnapshotEntry {
  id: string;
  filePath: string;
  sourceType: string;
  contentHash: string;
  versionLabel: string | null;
}

export interface Prompt3InputResult {
  promptText: string;
  inputContext: string;
  sourceSnapshot: string;
}

@Injectable()
export class Prompt3InputBuilderService {
  constructor(
    private readonly artifactStorage: ArtifactStorageService,
    private readonly knowledgeSourcesService: KnowledgeSourcesService,
    private readonly selectionService: KnowledgeSourceSelectionService,
    private readonly knowledgeSourceContent: KnowledgeSourceContentService,
  ) {}

  async buildPrompt3Input(
    workspace: Prompt3WorkspaceContext,
    templateContent: string,
  ): Promise<Prompt3InputResult> {
    if (!PRE_PDF_CHECK_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Prompt 3 can only run when workspace status is pre_pdf_check_ready. Current status: ${workspace.status}`,
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
    const vacancyText = await this.readOptionalVacancySource(workspaceAbsPath);

    const activeSources = await this.knowledgeSourcesService.findActive();
    const knowledgeSources = this.selectionService.selectForStep(
      'prompt_3',
      activeSources,
    );

    const knowledgeSourcesBlock =
      knowledgeSources.length > 0
        ? (await this.knowledgeSourceContent.loadContent(knowledgeSources))
            .map((entry) =>
              entry.contentAvailable
                ? `[Source: ${entry.sourceType} | ${entry.filePath}]\n${entry.content}`
                : `[Source: ${entry.sourceType} | ${entry.filePath}]\n[Content unavailable: ${entry.unavailableReason}]`,
            )
            .join('\n\n')
        : '[No active knowledge sources available]';

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
      ``,
      `=== VACANCY SOURCE (raw, context only) ===`,
      vacancyText ?? '[No raw vacancy source artifact available]',
      ``,
      `=== KNOWLEDGE SOURCES ===`,
      knowledgeSourcesBlock,
    ].join('\n');

    const snapshot = {
      cvContentPath,
      knowledgeSources: knowledgeSources.map(
        (ks): Prompt3SourceSnapshotEntry => ({
          id: ks.id,
          filePath: ks.filePath,
          sourceType: ks.sourceType,
          contentHash: ks.contentHash,
          versionLabel: ks.versionLabel,
        }),
      ),
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

  private async readOptionalVacancySource(
    workspaceAbsPath: string,
  ): Promise<string | undefined> {
    const txtPath = path.join(workspaceAbsPath, '00_vacancy_source.txt');
    try {
      return await this.artifactStorage.readFile(txtPath);
    } catch {
      return undefined;
    }
  }
}
