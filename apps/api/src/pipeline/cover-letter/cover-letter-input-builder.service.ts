import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  ManualNoteContextEntry,
  buildManualNoteBlock,
} from '../prompt-input-builder.service';

const COVER_LETTER_ALLOWED_STATUSES = ['cv_pdf_generated', 'final_check_ready'];

export interface CoverLetterWorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  roleTitleOriginal: string;
  workspacePath: string;
  storageRoot: string;
  manualNotes?: ManualNoteContextEntry[];
}

export interface CoverLetterInputResult {
  promptText: string;
  inputContext: string;
  sourceSnapshot: string;
}

@Injectable()
export class CoverLetterInputBuilderService {
  constructor(
    private readonly artifactStorage: ArtifactStorageService,
    private readonly knowledgeSourcesService: KnowledgeSourcesService,
    private readonly selectionService: KnowledgeSourceSelectionService,
    private readonly knowledgeSourceContent: KnowledgeSourceContentService,
  ) {}

  async buildCoverLetterInput(
    workspace: CoverLetterWorkspaceContext,
    templateContent: string,
  ): Promise<CoverLetterInputResult> {
    if (!COVER_LETTER_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Cover letter generation can only run when workspace status is cv_pdf_generated or final_check_ready. Current status: ${workspace.status}`,
      );
    }

    const workspaceAbsPath = path.join(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const vacancySourcePath = path.join(
      workspaceAbsPath,
      '00_vacancy_source.txt',
    );

    const vacancyText =
      await this.artifactStorage.readFileIfExists(vacancySourcePath);
    if (vacancyText === null) {
      throw new BadRequestException(
        'Vacancy source artifact not found (00_vacancy_source.txt).',
      );
    }

    const cvContentPath = path.join(
      workspaceAbsPath,
      '02_targeted_cv_content.json',
    );

    const cvContentText =
      await this.artifactStorage.readFileIfExists(cvContentPath);
    if (cvContentText === null) {
      throw new BadRequestException(
        'Targeted CV content artifact not found (02_targeted_cv_content.json). Generate CV content first.',
      );
    }

    const analysisText = await this.readOptionalArtifact(
      workspaceAbsPath,
      '01_vacancy_analysis.json',
    );

    const activeSources = await this.knowledgeSourcesService.findActive();
    const knowledgeSources = this.selectionService.selectForStep(
      'cover_letter',
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

    const manualNoteBlock = buildManualNoteBlock(workspace.manualNotes);

    const inputContext = [
      `=== WORKSPACE METADATA ===`,
      `Company: ${workspace.companyNameOriginal}`,
      `Role: ${workspace.roleTitleOriginal}`,
      ``,
      `=== VACANCY SOURCE (00_vacancy_source.txt) ===`,
      vacancyText,
      ``,
      `=== PROMPT 1 ANALYSIS (context only) ===`,
      analysisText ?? '[No vacancy analysis artifact available]',
      ``,
      `=== TARGETED CV CONTENT (02_targeted_cv_content.json) ===`,
      cvContentText,
      ``,
      `=== KNOWLEDGE SOURCES ===`,
      knowledgeSourcesBlock,
      ...manualNoteBlock,
    ].join('\n');

    const snapshot = {
      vacancySourcePath,
      cvContentPath,
      knowledgeSources: knowledgeSources.map((ks) => ({
        id: ks.id,
        filePath: ks.filePath,
        sourceType: ks.sourceType,
        contentHash: ks.contentHash,
        versionLabel: ks.versionLabel,
      })),
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
    return (await this.artifactStorage.readFileIfExists(filePath)) ?? undefined;
  }
}
