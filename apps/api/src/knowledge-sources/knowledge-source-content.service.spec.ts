import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeSource } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { HashService } from '../artifacts/hash.service';
import { KnowledgeSourceContentService } from './knowledge-source-content.service';

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

function makeSource(overrides: Partial<KnowledgeSource>): KnowledgeSource {
  return {
    id: 'ks-1',
    filePath: '',
    sourceType: 'profile_summary',
    isActive: true,
    contentHash: '',
    versionLabel: 'v1',
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('KnowledgeSourceContentService', () => {
  let service: KnowledgeSourceContentService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jobflow-ks-test-'));
    const configService = {
      get: (key: string) =>
        key === 'KNOWLEDGE_SOURCES_ROOT' ? tmpDir : undefined,
      getOrThrow: (key: string) =>
        key === 'KNOWLEDGE_SOURCES_ROOT' ? tmpDir : undefined,
    } as unknown as ConfigService;
    service = new KnowledgeSourceContentService(
      configService,
      new HashService(),
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns [] for an empty sources array without touching the filesystem', async () => {
    const result = await service.loadContent([]);
    expect(result).toEqual([]);
  });

  it('loads real content for a .md source whose hash matches', async () => {
    const content = 'Profile summary content.\nSecond line.';
    const filePath = path.join(tmpDir, 'profile.md');
    await fs.writeFile(filePath, content, 'utf-8');
    const source = makeSource({
      id: 'ks-md',
      filePath,
      sourceType: 'profile_summary',
      contentHash: hashText(content),
    });

    const result = await service.loadContent([source]);

    expect(result).toEqual([
      {
        id: 'ks-md',
        sourceType: 'profile_summary',
        filePath,
        versionLabel: 'v1',
        contentAvailable: true,
        content,
      },
    ]);
  });

  it('throws BadRequestException when on-disk content no longer matches contentHash', async () => {
    const originalContent = 'Original content.';
    const filePath = path.join(tmpDir, 'stale.md');
    await fs.writeFile(filePath, originalContent, 'utf-8');
    const staleHash = hashText(originalContent);

    await fs.writeFile(
      filePath,
      'Changed content after hash was computed.',
      'utf-8',
    );

    const source = makeSource({
      id: 'ks-stale',
      filePath,
      sourceType: 'cv_rules',
      contentHash: staleHash,
    });

    await expect(service.loadContent([source])).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.loadContent([source])).rejects.toThrow(/cv_rules/);
  });

  it('returns a content-unavailable stub for a .pdf source without throwing', async () => {
    const filePath = path.join(tmpDir, 'layout.pdf');
    await fs.writeFile(filePath, Buffer.from([0x25, 0x50, 0x44, 0x46]));
    const source = makeSource({
      id: 'ks-pdf',
      filePath,
      sourceType: 'layout',
      contentHash: 'irrelevant-for-binary-sources',
    });

    const result = await service.loadContent([source]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'ks-pdf',
      sourceType: 'layout',
      filePath,
      versionLabel: 'v1',
      contentAvailable: false,
    });
    expect(
      (result[0] as { unavailableReason: string }).unavailableReason,
    ).toMatch(/not parsed/);
  });

  it('throws when filePath resolves outside KNOWLEDGE_SOURCES_ROOT', async () => {
    const outsidePath = path.join(tmpDir, '..', 'outside.md');
    const source = makeSource({
      id: 'ks-outside',
      filePath: outsidePath,
      contentHash: 'does-not-matter',
    });

    await expect(service.loadContent([source])).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.loadContent([source])).rejects.toThrow(
      /Path traversal/,
    );
  });
});
