import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  KnowledgeSourceEntry,
  KnowledgeSourceRegistrationClient,
  registerKnowledgeSources,
} from './knowledge-source-registration';

interface Row {
  id: string;
  filePath: string;
  sourceType: string;
  versionLabel: string;
  contentHash: string;
  isActive: boolean;
}

interface RowData {
  filePath?: string;
  sourceType?: string;
  versionLabel?: string;
  contentHash?: string;
  isActive?: boolean;
}

interface UpdateManyArgs {
  where: { isActive: boolean; id: { notIn: string[] } };
  data: { isActive: boolean };
}

const hashText = (text: string): string =>
  createHash('sha256').update(text, 'utf-8').digest('hex');

// In-memory stand-in for the Prisma client: enough of `knowledgeSource`
// to observe what registration writes, plus a `$transaction` spy.
const createFakeClient = (initialRows: Row[]) => {
  const rows = initialRows.map((row) => ({ ...row }));
  let nextId = rows.length + 1;

  const knowledgeSource = {
    findFirst: jest.fn((args: { where: { filePath: string } }) =>
      Promise.resolve(
        rows.find((row) => row.filePath === args.where.filePath) ?? null,
      ),
    ),
    update: jest.fn((args: { where: { id: string }; data: RowData }) => {
      const row = rows.find((item) => item.id === args.where.id);
      if (!row) throw new Error(`No row ${args.where.id}`);
      Object.assign(row, args.data);
      return Promise.resolve(row);
    }),
    create: jest.fn((args: { data: RowData }) => {
      const row = { id: `ks-${nextId++}`, ...args.data } as Row;
      rows.push(row);
      return Promise.resolve(row);
    }),
    updateMany: jest.fn((args: UpdateManyArgs) => {
      const excluded = new Set(args.where.id.notIn);
      const matched = rows.filter(
        (row) => row.isActive === args.where.isActive && !excluded.has(row.id),
      );
      for (const row of matched) row.isActive = args.data.isActive;
      return Promise.resolve({ count: matched.length });
    }),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  const tx = { knowledgeSource };
  const $transaction = jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
    fn(tx),
  );
  const client = {
    $transaction,
  } as unknown as KnowledgeSourceRegistrationClient;

  return { client, rows, knowledgeSource, $transaction };
};

describe('registerKnowledgeSources', () => {
  let root: string;

  const writeSource = async (relativePath: string, content: string) => {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf-8');
    return absolutePath;
  };

  const entry = (
    relativePath: string,
    sourceType: string,
    versionLabel: string,
  ): KnowledgeSourceEntry => ({ relativePath, sourceType, versionLabel });

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'jobflow-ks-register-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('deactivates active sources that are not in the registered list', async () => {
    const oldCv = await writeSource('profile/cv_v1.md', 'old cv');
    const oldRules = await writeSource('rules/rules_v1.md', 'old rules');
    const newCv = await writeSource('profile/cv_v2.md', 'new cv');
    const newRules = await writeSource('rules/rules_v2.md', 'new rules');
    const fake = createFakeClient([
      {
        id: 'ks-old-cv',
        filePath: oldCv,
        sourceType: 'master_cv',
        versionLabel: 'v1',
        contentHash: hashText('old cv'),
        isActive: true,
      },
      {
        id: 'ks-old-rules',
        filePath: oldRules,
        sourceType: 'cv_rules',
        versionLabel: 'v1',
        contentHash: hashText('old rules'),
        isActive: true,
      },
    ]);

    const result = await registerKnowledgeSources(fake.client, root, [
      entry('profile/cv_v2.md', 'master_cv', 'v2'),
      entry('rules/rules_v2.md', 'cv_rules', 'v2'),
    ]);

    const byPath = new Map(fake.rows.map((row) => [row.filePath, row]));
    expect(byPath.get(oldCv)?.isActive).toBe(false);
    expect(byPath.get(oldRules)?.isActive).toBe(false);
    expect(byPath.get(newCv)).toMatchObject({
      isActive: true,
      sourceType: 'master_cv',
      versionLabel: 'v2',
      contentHash: hashText('new cv'),
    });
    expect(byPath.get(newRules)?.isActive).toBe(true);
    expect(fake.rows).toHaveLength(4);
    expect(result).toEqual({
      created: ['profile/cv_v2.md', 'rules/rules_v2.md'],
      updated: [],
      deactivatedCount: 2,
    });
    expect(fake.$transaction).toHaveBeenCalledTimes(1);
  });

  it('keeps exactly one active source per type after switching versions', async () => {
    const oldCv = await writeSource('profile/cv_v1.md', 'old cv');
    await writeSource('profile/cv_v2.md', 'new cv');
    const fake = createFakeClient([
      {
        id: 'ks-old-cv',
        filePath: oldCv,
        sourceType: 'master_cv',
        versionLabel: 'v1',
        contentHash: hashText('old cv'),
        isActive: true,
      },
    ]);

    await registerKnowledgeSources(fake.client, root, [
      entry('profile/cv_v2.md', 'master_cv', 'v2'),
    ]);

    const activeCvs = fake.rows.filter(
      (row) => row.isActive && row.sourceType === 'master_cv',
    );
    expect(activeCvs).toHaveLength(1);
    expect(activeCvs[0].versionLabel).toBe('v2');
  });

  it('re-registering the same path updates the hash without a new row', async () => {
    const cvPath = await writeSource('profile/cv_v2.md', 'first content');
    const fake = createFakeClient([]);
    const entries = [entry('profile/cv_v2.md', 'master_cv', 'v2')];

    await registerKnowledgeSources(fake.client, root, entries);
    await fs.writeFile(cvPath, 'edited content', 'utf-8');
    const second = await registerKnowledgeSources(fake.client, root, entries);

    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({
      filePath: cvPath,
      contentHash: hashText('edited content'),
      isActive: true,
    });
    expect(fake.knowledgeSource.create).toHaveBeenCalledTimes(1);
    expect(second).toEqual({
      created: [],
      updated: ['profile/cv_v2.md'],
      deactivatedCount: 0,
    });
  });

  it('missing file aborts before any database write', async () => {
    const oldCv = await writeSource('profile/cv_v1.md', 'old cv');
    await writeSource('profile/cv_v2.md', 'new cv');
    const initial: Row = {
      id: 'ks-old-cv',
      filePath: oldCv,
      sourceType: 'master_cv',
      versionLabel: 'v1',
      contentHash: hashText('old cv'),
      isActive: true,
    };
    const fake = createFakeClient([initial]);

    await expect(
      registerKnowledgeSources(fake.client, root, [
        entry('profile/cv_v2.md', 'master_cv', 'v2'),
        entry('rules/missing.md', 'cv_rules', 'v2'),
      ]),
    ).rejects.toThrow('Knowledge source file not found');

    expect(fake.$transaction).not.toHaveBeenCalled();
    expect(fake.knowledgeSource.create).not.toHaveBeenCalled();
    expect(fake.knowledgeSource.update).not.toHaveBeenCalled();
    expect(fake.knowledgeSource.updateMany).not.toHaveBeenCalled();
    expect(fake.rows).toEqual([initial]);
  });

  it('rejects a path that escapes the root before any database write', async () => {
    const fake = createFakeClient([]);

    await expect(
      registerKnowledgeSources(fake.client, root, [
        entry('../outside.md', 'master_cv', 'v2'),
      ]),
    ).rejects.toThrow('escapes the root');
    expect(fake.$transaction).not.toHaveBeenCalled();
  });

  it('deactivates a duplicate active row that has a registered path', async () => {
    const cvPath = await writeSource('profile/cv_v2.md', 'new cv');
    const duplicate = (id: string): Row => ({
      id,
      filePath: cvPath,
      sourceType: 'master_cv',
      versionLabel: 'v2',
      contentHash: hashText('new cv'),
      isActive: true,
    });
    const fake = createFakeClient([duplicate('ks-a'), duplicate('ks-b')]);

    const result = await registerKnowledgeSources(fake.client, root, [
      entry('profile/cv_v2.md', 'master_cv', 'v2'),
    ]);

    expect(fake.rows.filter((row) => row.isActive)).toHaveLength(1);
    expect(fake.rows).toHaveLength(2);
    expect(result.deactivatedCount).toBe(1);
  });

  it('accepts an in-root file whose name starts with two dots', async () => {
    await writeSource('..notes.md', 'notes');
    const fake = createFakeClient([]);

    const result = await registerKnowledgeSources(fake.client, root, [
      entry('..notes.md', 'cv_rules', 'v1'),
    ]);

    expect(result.created).toEqual(['..notes.md']);
  });

  it('rejects an in-root symlink that points outside the root', async () => {
    const outsideDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'jobflow-ks-outside-'),
    );
    try {
      const outsideFile = path.join(outsideDir, 'secret.md');
      await fs.writeFile(outsideFile, 'outside', 'utf-8');
      await fs.symlink(outsideFile, path.join(root, 'link.md'), 'file');
      const fake = createFakeClient([]);

      await expect(
        registerKnowledgeSources(fake.client, root, [
          entry('link.md', 'master_cv', 'v2'),
        ]),
      ).rejects.toThrow('escapes the root');
      expect(fake.$transaction).not.toHaveBeenCalled();
    } finally {
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });

  it('never deletes or reactivates sources outside the list', async () => {
    const archived = await writeSource('profile/cv_v0.md', 'archived cv');
    await writeSource('profile/cv_v2.md', 'new cv');
    const fake = createFakeClient([
      {
        id: 'ks-archived',
        filePath: archived,
        sourceType: 'master_cv',
        versionLabel: 'v0',
        contentHash: hashText('archived cv'),
        isActive: false,
      },
    ]);

    const result = await registerKnowledgeSources(fake.client, root, [
      entry('profile/cv_v2.md', 'master_cv', 'v2'),
    ]);

    const archivedRow = fake.rows.find((row) => row.id === 'ks-archived');
    expect(archivedRow).toMatchObject({ filePath: archived, isActive: false });
    expect(fake.rows).toHaveLength(2);
    expect(result.deactivatedCount).toBe(0);
    expect(fake.knowledgeSource.delete).not.toHaveBeenCalled();
    expect(fake.knowledgeSource.deleteMany).not.toHaveBeenCalled();
  });
});
