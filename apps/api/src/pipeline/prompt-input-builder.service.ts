import { Injectable } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { KnowledgeSourceContentService } from '../knowledge-sources/knowledge-source-content.service';

export interface WorkspaceInputContext {
  companyNameOriginal: string;
  companySlug: string;
  roleTitleOriginal: string;
  roleSlug: string;
  workspaceSlug: string;
  workspacePath: string;
  storageRoot: string;
  manualNote?: string | null;
}

export interface PromptInputResult {
  promptText: string;
  inputContext: string;
  sourceSnapshot: string;
}

export interface SourceSnapshotEntry {
  id: string;
  filePath: string;
  sourceType: string;
  contentHash: string;
  versionLabel: string | null;
}

@Injectable()
export class PromptInputBuilderService {
  constructor(
    private readonly artifactStorage: ArtifactStorageService,
    private readonly knowledgeSourceContent: KnowledgeSourceContentService,
  ) {}

  async buildPrompt1Input(
    workspace: WorkspaceInputContext,
    templateContent: string,
    knowledgeSources: KnowledgeSource[],
  ): Promise<PromptInputResult> {
    const vacancySourcePath = path.join(
      workspace.storageRoot,
      workspace.workspacePath,
      '00_vacancy_source.txt',
    );

    const vacancyText = await this.artifactStorage.readFile(vacancySourcePath);

    const sourceSnapshot: SourceSnapshotEntry[] = knowledgeSources.map(
      (ks) => ({
        id: ks.id,
        filePath: ks.filePath,
        sourceType: ks.sourceType,
        contentHash: ks.contentHash,
        versionLabel: ks.versionLabel,
      }),
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

    const manualNoteBlock: string[] = [];
    if (workspace.manualNote) {
      manualNoteBlock.push(``, `=== MANUAL NOTE ===`, workspace.manualNote);
    }

    const inputContext = [
      `=== WORKSPACE METADATA ===`,
      `Company: ${workspace.companyNameOriginal} (slug: ${workspace.companySlug})`,
      `Role: ${workspace.roleTitleOriginal} (slug: ${workspace.roleSlug})`,
      ``,
      `=== VACANCY TEXT ===`,
      vacancyText,
      ``,
      `=== KNOWLEDGE SOURCES ===`,
      knowledgeSourcesBlock,
      ...manualNoteBlock,
    ].join('\n');

    return {
      promptText: templateContent,
      inputContext,
      sourceSnapshot: JSON.stringify(sourceSnapshot),
    };
  }
}
