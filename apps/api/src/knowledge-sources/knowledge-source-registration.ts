import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeSourceEntry {
  relativePath: string;
  sourceType: string;
  versionLabel: string;
}

export interface KnowledgeSourceRegistrationResult {
  created: string[];
  updated: string[];
  deactivatedCount: number;
}

export type KnowledgeSourceRegistrationClient = Pick<
  PrismaClient,
  '$transaction'
>;

interface ResolvedEntry {
  entry: KnowledgeSourceEntry;
  absolutePath: string;
  contentHash: string;
}

const hashFile = (absolutePath: string): string => {
  const content = fs.readFileSync(absolutePath, 'utf-8');
  return createHash('sha256').update(content, 'utf-8').digest('hex');
};

const isInsideRoot = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  if (relative === '' || path.isAbsolute(relative)) return false;
  return relative !== '..' && !relative.startsWith(`..${path.sep}`);
};

const resolveInsideRoot = (root: string, relativePath: string): string => {
  const absolutePath = path.resolve(root, relativePath);
  if (!isInsideRoot(root, absolutePath)) {
    throw new Error(`Knowledge source path escapes the root: ${relativePath}`);
  }
  return absolutePath;
};

const assertRealPathInsideRoot = (root: string, absolutePath: string) => {
  const realRoot = fs.realpathSync(root);
  if (!isInsideRoot(realRoot, fs.realpathSync(absolutePath))) {
    throw new Error(`Knowledge source path escapes the root: ${absolutePath}`);
  }
};

const isRegularFile = (absolutePath: string): boolean => {
  try {
    return fs.statSync(absolutePath).isFile();
  } catch {
    return false;
  }
};

/**
 * Every `sourceType` that occurs more than once in the list, each named once, in the order of
 * its first occurrence. Pipeline steps expect one active source per type, so a list with a
 * repeat would activate two files of one type.
 */
export const findDuplicateSourceTypes = (
  entries: readonly Pick<KnowledgeSourceEntry, 'sourceType'>[],
): string[] => {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.sourceType, (counts.get(entry.sourceType) ?? 0) + 1);
  }
  const duplicates: string[] = [];
  for (const [sourceType, count] of counts) {
    if (count > 1) duplicates.push(sourceType);
  }
  return duplicates;
};

const resolveEntries = (
  root: string,
  entries: readonly KnowledgeSourceEntry[],
): ResolvedEntry[] => {
  const duplicates = findDuplicateSourceTypes(entries);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate knowledge source type, each type must be listed once: ${duplicates.join(', ')}`,
    );
  }

  const located = entries.map((entry) => ({
    entry,
    absolutePath: resolveInsideRoot(root, entry.relativePath),
  }));

  const missing = located
    .filter((item) => !isRegularFile(item.absolutePath))
    .map((item) => item.absolutePath);
  if (missing.length > 0) {
    throw new Error(`Knowledge source file not found: ${missing.join(', ')}`);
  }

  for (const item of located) assertRealPathInsideRoot(root, item.absolutePath);

  return located.map((item) => ({
    ...item,
    contentHash: hashFile(item.absolutePath),
  }));
};

const upsertEntry = async (
  tx: Prisma.TransactionClient,
  item: ResolvedEntry,
): Promise<{ id: string; isCreated: boolean }> => {
  const { entry, absolutePath, contentHash } = item;
  const data = {
    sourceType: entry.sourceType,
    versionLabel: entry.versionLabel,
    contentHash,
    isActive: true,
  };
  const existing = await tx.knowledgeSource.findFirst({
    where: { filePath: absolutePath },
  });
  if (existing) {
    await tx.knowledgeSource.update({ where: { id: existing.id }, data });
    return { id: existing.id, isCreated: false };
  }
  const created = await tx.knowledgeSource.create({
    data: { filePath: absolutePath, ...data },
  });
  return { id: created.id, isCreated: true };
};

/**
 * Registers the given knowledge-source files and leaves exactly these
 * sources active: every other active `KnowledgeSource` row is switched to
 * `isActive: false` in the same transaction. Rows are never deleted —
 * source snapshots of past prompt runs refer to them. The list and all files
 * are checked and hashed before the transaction, so a repeated `sourceType`
 * or a missing file aborts without a single database write.
 */
export const registerKnowledgeSources = async (
  client: KnowledgeSourceRegistrationClient,
  root: string,
  entries: readonly KnowledgeSourceEntry[],
): Promise<KnowledgeSourceRegistrationResult> => {
  const resolved = resolveEntries(path.resolve(root), entries);

  return client.$transaction(async (tx) => {
    const created: string[] = [];
    const updated: string[] = [];
    const keptIds: string[] = [];
    for (const item of resolved) {
      const { id, isCreated } = await upsertEntry(tx, item);
      keptIds.push(id);
      const target = isCreated ? created : updated;
      target.push(item.entry.relativePath);
    }

    // By id, not by path: a second active row with a registered path (a
    // duplicate left by an earlier import) must be switched off as well.
    const deactivated = await tx.knowledgeSource.updateMany({
      where: { isActive: true, id: { notIn: keptIds } },
      data: { isActive: false },
    });

    return { created, updated, deactivatedCount: deactivated.count };
  });
};
