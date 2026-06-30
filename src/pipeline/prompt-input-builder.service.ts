import { Injectable } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';

export interface WorkspaceInputContext {
  companyNameOriginal: string;
  companySlug: string;
  roleTitleOriginal: string;
  roleSlug: string;
  workspaceSlug: string;
  workspacePath: string;
  storageRoot: string;
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
}

@Injectable()
export class PromptInputBuilderService {
  constructor(private readonly artifactStorage: ArtifactStorageService) {}

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

    const sourceSnapshot: SourceSnapshotEntry[] = knowledgeSources.map((ks) => ({
      id: ks.id,
      filePath: ks.filePath,
      sourceType: ks.sourceType,
      contentHash: ks.contentHash,
    }));

    const knowledgeSourcesBlock =
      knowledgeSources.length > 0
        ? knowledgeSources
            .map((ks) => `[Source: ${ks.sourceType} | ${ks.filePath}]\n[content not loaded in MVP]`)
            .join('\n\n')
        : '[No active knowledge sources available]';

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
    ].join('\n');

    return {
      promptText: templateContent,
      inputContext,
      sourceSnapshot: JSON.stringify(sourceSnapshot),
    };
  }
}
