import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeSource } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HashService } from '../artifacts/hash.service';

type KnowledgeSourceContentBase = {
  id: string;
  sourceType: string;
  filePath: string;
  versionLabel: string | null;
};

export type KnowledgeSourceContentEntry = KnowledgeSourceContentBase &
  (
    | { contentAvailable: true; content: string }
    | { contentAvailable: false; unavailableReason: string }
  );

const TEXT_EXTENSIONS = new Set(['.md', '.txt']);

@Injectable()
export class KnowledgeSourceContentService {
  private readonly _knowledgeSourcesRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly hashService: HashService,
  ) {
    this._knowledgeSourcesRoot = path.resolve(
      configService.getOrThrow<string>('KNOWLEDGE_SOURCES_ROOT'),
    );
  }

  get knowledgeSourcesRoot(): string {
    return this._knowledgeSourcesRoot;
  }

  async loadContent(
    sources: KnowledgeSource[],
  ): Promise<KnowledgeSourceContentEntry[]> {
    if (sources.length === 0) {
      return [];
    }

    const entries: KnowledgeSourceContentEntry[] = [];
    const mismatches: string[] = [];

    for (const source of sources) {
      const resolvedPath = path.resolve(source.filePath);
      this.assertInsideKnowledgeSourcesRoot(resolvedPath);

      const ext = path.extname(resolvedPath).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext)) {
        entries.push({
          id: source.id,
          sourceType: source.sourceType,
          filePath: source.filePath,
          versionLabel: source.versionLabel,
          contentAvailable: false,
          unavailableReason: `Binary/unsupported source type ("${ext || 'no extension'}") — content not parsed in MVP`,
        });
        continue;
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const actualHash = this.hashService.hashText(content);
      if (actualHash !== source.contentHash) {
        mismatches.push(
          `sourceType="${source.sourceType}" filePath="${source.filePath}" expectedHash="${source.contentHash}" actualHash="${actualHash}"`,
        );
        continue;
      }

      entries.push({
        id: source.id,
        sourceType: source.sourceType,
        filePath: source.filePath,
        versionLabel: source.versionLabel,
        contentAvailable: true,
        content,
      });
    }

    if (mismatches.length > 0) {
      throw new BadRequestException(
        `Knowledge source content hash mismatch: ${mismatches.join('; ')}`,
      );
    }

    return entries;
  }

  private assertInsideKnowledgeSourcesRoot(resolvedPath: string): void {
    const rootWithSep = this._knowledgeSourcesRoot.endsWith(path.sep)
      ? this._knowledgeSourcesRoot
      : this._knowledgeSourcesRoot + path.sep;
    if (
      resolvedPath !== this._knowledgeSourcesRoot &&
      !resolvedPath.startsWith(rootWithSep)
    ) {
      throw new BadRequestException(
        `Path traversal detected: "${resolvedPath}" is outside knowledge sources root "${this._knowledgeSourcesRoot}"`,
      );
    }
  }
}
