import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';

export interface Prompt2WorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  companySlug: string;
  roleTitleOriginal: string;
  roleSlug: string;
  workspacePath: string;
  storageRoot: string;
  manualNote?: string | null;
}

export interface Prompt2SourceSnapshotEntry {
  id: string;
  filePath: string;
  sourceType: string;
  contentHash: string;
  versionLabel: string | null;
}

export interface Prompt2SourceSnapshot {
  vacancySourceHash: string;
  knowledgeSources: Prompt2SourceSnapshotEntry[];
}

export interface Prompt2InputResult {
  promptText: string;
  templateVersion: number;
  inputContext: string;
  sourceSnapshot: string;
}

@Injectable()
export class Prompt2InputBuilderService {
  constructor(
    private readonly artifactStorage: ArtifactStorageService,
    private readonly knowledgeSourcesService: KnowledgeSourcesService,
    private readonly selectionService: KnowledgeSourceSelectionService,
    private readonly knowledgeSourceContent: KnowledgeSourceContentService,
  ) {}

  private static readonly ALLOWED_STATUSES = [
    'cv_generation_running',
    // A regenerate — the CV draft already exists and the workspace is still sitting at the CV
    // draft review gate (not yet approved past it).
    'cv_draft_ready',
    'paused_after_cv_draft',
  ];

  async buildPrompt2Input(
    workspace: Prompt2WorkspaceContext,
    templateContent: string,
    templateVersion: number,
    regenerateNotes?: string,
  ): Promise<Prompt2InputResult> {
    if (
      !Prompt2InputBuilderService.ALLOWED_STATUSES.includes(workspace.status)
    ) {
      throw new BadRequestException(
        `Prompt 2 can only run when workspace status is cv_generation_running (first generation) or cv_draft_ready/paused_after_cv_draft (regenerate). Current status: ${workspace.status}`,
      );
    }
    const isRegenerate = workspace.status !== 'cv_generation_running';

    const workspaceAbsPath = path.join(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const vacancySourcePath = path.join(
      workspaceAbsPath,
      '00_vacancy_source.txt',
    );

    let vacancyText: string;
    try {
      vacancyText = await this.artifactStorage.readFile(vacancySourcePath);
    } catch {
      throw new BadRequestException(
        'Vacancy source artifact not found (00_vacancy_source.txt).',
      );
    }

    const analysisText = await this.readAnalysisArtifact(workspaceAbsPath);

    const activeSources = await this.knowledgeSourcesService.findActive();
    const knowledgeSources = this.selectionService.selectForStep(
      'prompt_2',
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

    // Regenerate: feed the previous draft + the user's feedback back in, so the AI revises
    // against concrete instructions instead of producing an unrelated fresh draft. Best-effort —
    // a missing previous draft (shouldn't happen once cv_draft_ready/paused_after_cv_draft is
    // reached, but defensive) doesn't block regeneration.
    const regenerateBlock: string[] = [];
    if (isRegenerate) {
      const previousDraftText =
        await this.readPreviousDraftArtifact(workspaceAbsPath);
      if (previousDraftText) {
        regenerateBlock.push(
          ``,
          `=== PREVIOUS CV DRAFT (revise this, do not start from scratch) ===`,
          previousDraftText,
        );
      }
      if (regenerateNotes) {
        regenerateBlock.push(
          ``,
          `=== USER FEEDBACK FOR REGENERATION (apply these changes) ===`,
          regenerateNotes,
        );
      }
    }

    const manualNoteBlock: string[] = [];
    if (workspace.manualNote) {
      manualNoteBlock.push(``, `=== MANUAL NOTE ===`, workspace.manualNote);
    }

    const inputContext = [
      `=== WORKSPACE METADATA ===`,
      `Company: ${workspace.companyNameOriginal} (slug: ${workspace.companySlug})`,
      `Role: ${workspace.roleTitleOriginal} (slug: ${workspace.roleSlug})`,
      ``,
      `=== VACANCY SOURCE ===`,
      vacancyText,
      ``,
      `=== PROMPT 1 ANALYSIS ===`,
      analysisText,
      ``,
      `=== KNOWLEDGE SOURCES ===`,
      knowledgeSourcesBlock,
      ...manualNoteBlock,
      ...regenerateBlock,
    ].join('\n');

    const vacancySourceHash = createHash('sha256')
      .update(vacancyText, 'utf-8')
      .digest('hex');

    const snapshot: Prompt2SourceSnapshot = {
      vacancySourceHash,
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
      templateVersion,
      inputContext,
      sourceSnapshot: JSON.stringify(snapshot),
    };
  }

  private async readAnalysisArtifact(
    workspaceAbsPath: string,
  ): Promise<string> {
    const jsonPath = path.join(workspaceAbsPath, '01_vacancy_analysis.json');
    try {
      return await this.artifactStorage.readFile(jsonPath);
    } catch {
      const mdPath = path.join(workspaceAbsPath, '01_vacancy_analysis.md');
      try {
        return await this.artifactStorage.readFile(mdPath);
      } catch {
        throw new BadRequestException(
          'Prompt 1 analysis artifact not found (01_vacancy_analysis.json / .md). Run analysis first.',
        );
      }
    }
  }

  /** Best-effort — returns null instead of throwing if no previous draft exists yet. */
  private async readPreviousDraftArtifact(
    workspaceAbsPath: string,
  ): Promise<string | null> {
    const jsonPath = path.join(workspaceAbsPath, '02_targeted_cv_content.json');
    try {
      return await this.artifactStorage.readFile(jsonPath);
    } catch {
      return null;
    }
  }
}
