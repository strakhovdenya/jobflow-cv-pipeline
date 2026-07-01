import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';

export interface Prompt2WorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  companySlug: string;
  roleTitleOriginal: string;
  roleSlug: string;
  workspacePath: string;
  storageRoot: string;
}

export interface Prompt2SourceSnapshotEntry {
  id: string;
  filePath: string;
  sourceType: string;
  contentHash: string;
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
  constructor(private readonly artifactStorage: ArtifactStorageService) {}

  async buildPrompt2Input(
    workspace: Prompt2WorkspaceContext,
    templateContent: string,
    templateVersion: number,
    knowledgeSources: KnowledgeSource[],
  ): Promise<Prompt2InputResult> {
    if (workspace.status !== 'cv_generation_running') {
      throw new BadRequestException(
        `Prompt 2 can only run when workspace status is cv_generation_running. Current status: ${workspace.status}`,
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
    const vacancyText = await this.artifactStorage.readFile(vacancySourcePath);

    const analysisText = await this.readAnalysisArtifact(workspaceAbsPath);

    const knowledgeSourcesBlock =
      knowledgeSources.length > 0
        ? knowledgeSources
            .map(
              (ks) =>
                `[Source: ${ks.sourceType} | ${ks.filePath}]\n[content not loaded in MVP]`,
            )
            .join('\n\n')
        : '[No active knowledge sources available]';

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
}
