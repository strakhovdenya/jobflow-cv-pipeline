import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  Prisma,
  WorkspaceStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FAKE_VACANCY_REQUIREMENTS_JSON } from '../ai/providers/fake.provider';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import {
  ArtifactsService,
  RegisterArtifactDto,
} from '../artifacts/artifacts.service';
import { CompanyService } from '../company/company.service';
import {
  ARTIFACT_TYPES,
  CARRIED_OVER_ORIGIN,
} from '../pipeline/analysis/experimental-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { ForkWorkspaceDto } from './dto/fork-workspace.dto';
import { WorkspaceForkService } from './workspace-fork.service';

// The fork service over a real ArtifactStorageService in a temporary STORAGE_ROOT (real byte
// copies and hashes) and an in-memory Prisma whose transaction rolls back on an error and whose
// workspace create enforces the two unique indexes the fork relies on.

const VACANCY_BYTES = Buffer.concat([
  Buffer.from('Sample vacancy\r\nРазработчик Node.js\n', 'utf-8'),
  Buffer.from([0xe2, 0x80, 0x94, 0x0a]),
]);
const REQUEST_KEY = '3f1c2b4a-8d7e-4f6a-9b0c-1d2e3f4a5b6c';
const OTHER_KEY = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const REQUIREMENTS_FILE = '01a_vacancy_requirements.json';

const sha256 = (data: Buffer | string) =>
  createHash('sha256').update(data).digest('hex');

type Row = Record<string, unknown> & { id: string };

interface State {
  workspaces: Row[];
  companies: Row[];
  vacancies: Row[];
  notes: Row[];
  noteApplications: Row[];
  artifacts: Row[];
  promptRuns: Row[];
  aiRuns: Row[];
}

const uniqueViolation = (target: string[]) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });

const matches = (row: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) => row[key] === value);

const createFakePrisma = (state: State) => {
  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const withWorkspaceRelations = (
    row: Row,
    include?: { company?: boolean; jobVacancy?: boolean },
  ) => ({
    ...row,
    ...(include?.company
      ? { company: state.companies.find((c) => c.id === row.companyId) }
      : {}),
    ...(include?.jobVacancy
      ? { jobVacancy: state.vacancies.find((v) => v.id === row.jobVacancyId) }
      : {}),
  });

  const transactionClient: { current: unknown } = { current: null };
  const client = {
    applicationWorkspace: {
      findUnique: jest.fn(
        async ({
          where,
          include,
        }: {
          where: { id: string };
          include?: { company?: boolean; jobVacancy?: boolean };
        }) => {
          const row = state.workspaces.find((item) => item.id === where.id);
          return row ? withWorkspaceRelations(row, include) : null;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
          include,
        }: {
          where: Record<string, unknown>;
          include?: { jobVacancy?: boolean };
        }) => {
          const row = state.workspaces.find((item) => matches(item, where));
          return row ? withWorkspaceRelations(row, include) : null;
        },
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          const rows = state.workspaces.filter((item) => matches(item, where));
          for (const row of rows) Object.assign(row, data);
          return { count: rows.length };
        },
      ),
      create: jest.fn(
        async ({
          data,
          include,
        }: {
          data: Record<string, unknown> & {
            forkedFrom: { connect: { id: string } };
            company: { connect: { id: string } };
            jobVacancy: { connect: { id: string } };
          };
          include?: { jobVacancy?: boolean };
        }) => {
          const { forkedFrom, company, jobVacancy, ...scalars } = data;
          const row: Row = {
            id: nextId('ws'),
            currentDecision: null,
            originalDecision: null,
            reviewState: null,
            score: null,
            isArchived: false,
            lastStepErrorStep: null,
            createdAt: new Date(),
            ...scalars,
            forkedFromWorkspaceId: forkedFrom.connect.id,
            companyId: company.connect.id,
            jobVacancyId: jobVacancy.connect.id,
          };
          if (
            state.workspaces.some((w) => w.workspaceSlug === row.workspaceSlug)
          ) {
            throw uniqueViolation(['workspaceSlug']);
          }
          const isKeyTaken =
            row.forkRequestKey !== null &&
            state.workspaces.some(
              (w) =>
                w.forkedFromWorkspaceId === row.forkedFromWorkspaceId &&
                w.forkRequestKey === row.forkRequestKey,
            );
          if (isKeyTaken) {
            throw uniqueViolation(['forkedFromWorkspaceId', 'forkRequestKey']);
          }
          state.workspaces.push(row);
          return withWorkspaceRelations(row, include);
        },
      ),
    },
    company: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: nextId('company'), ...data };
        state.companies.push(row);
        return row;
      }),
    },
    jobVacancy: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: Record<string, unknown> & {
            company: { connect: { id: string } };
          };
        }) => {
          const { company, ...scalars } = data;
          const row = {
            id: nextId('vacancy'),
            ...scalars,
            companyId: company.connect.id,
          };
          state.vacancies.push(row);
          return row;
        },
      ),
    },
    manualNote: {
      findMany: jest.fn(async ({ where }: { where: { workspaceId: string } }) =>
        state.notes.filter((note) => note.workspaceId === where.workspaceId),
      ),
      createMany: jest.fn(
        async ({ data }: { data: Record<string, unknown>[] }) => {
          for (const note of data)
            state.notes.push({ id: nextId('note'), ...note });
          return { count: data.length };
        },
      ),
    },
    generatedArtifact: {
      findFirst: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          state.artifacts.find((item) => matches(item, where)) ?? null,
      ),
      count: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          state.artifacts.filter((item) => matches(item, where)).length,
      ),
    },
    promptRun: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const run = state.promptRuns.find((item) => item.id === where.id);
        if (!run) return null;
        return {
          ...run,
          aiRun: state.aiRuns.find((item) => item.id === run.aiRunId) ?? null,
        };
      }),
    },
    $transaction: jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>): Promise<unknown> => {
        const snapshot = structuredClone(state);
        try {
          return await callback(transactionClient.current);
        } catch (error) {
          Object.assign(state, snapshot);
          throw error;
        }
      },
    ),
  };
  transactionClient.current = client;
  return client;
};

const createHarness = () => {
  const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jobflow-fork-'));
  const storage = new ArtifactStorageService({
    getOrThrow: () => storageRoot,
  } as unknown as ConfigService);
  const state: State = {
    workspaces: [],
    companies: [],
    vacancies: [],
    notes: [],
    noteApplications: [],
    artifacts: [],
    promptRuns: [],
    aiRuns: [],
  };
  const prisma = createFakePrisma(state);
  const artifactsService = {
    register: jest.fn(async (dto: RegisterArtifactDto) => {
      const row = {
        id: `artifact-${state.artifacts.length + 1}`,
        promptRunId: null,
        isLatest: true,
        version: 1,
        downloadFileName: null,
        ...dto,
      };
      state.artifacts.push(row);
      return row;
    }),
  };
  const service = new WorkspaceForkService(
    prisma as unknown as PrismaService,
    storage,
    artifactsService as unknown as ArtifactsService,
    new CompanyService(prisma as unknown as PrismaService),
    new VacancyService(prisma as unknown as PrismaService),
  );

  // A source workspace as `createWorkspace` leaves it, with its `00` on disk.
  const addSource = (overrides: Partial<Row> = {}) => {
    const id = `source-${state.workspaces.length + 1}`;
    const folder = path.join(storageRoot, `source_folder_${id}`);
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, '00_vacancy_source.txt'), VACANCY_BYTES);
    state.companies.push({
      id: `${id}-company`,
      nameOriginal: 'Sample Company GmbH',
      companySlug: 'Sample_Company_GmbH',
      normalizedName: null,
    });
    state.vacancies.push({
      id: `${id}-vacancy`,
      companyId: `${id}-company`,
      roleTitleOriginal: 'Senior Разработчик (Node.js)',
      roleSlug: 'Senior_Разработчик_Node_js',
      sourceUrl: 'https://example.com/job',
      languageDetected: null,
      locationText: null,
      remoteType: null,
      employmentType: null,
      seniority: null,
      vacancyTextPath: path.join(folder, '00_vacancy_source.txt'),
      vacancyTextHash: sha256(VACANCY_BYTES),
      vacancyTextSizeBytes: null,
      sourceFormat: 'pasted_text',
      originalImportedFileName: null,
    });
    const row: Row = {
      id,
      companyId: `${id}-company`,
      jobVacancyId: `${id}-vacancy`,
      workspaceSlug: `2026_11_01_${id}`,
      storageRoot,
      workspacePath: `source_folder_${id}`,
      status: WorkspaceStatus.source_saved,
      currentDecision: null,
      originalDecision: null,
      reviewState: null,
      score: null,
      isArchived: false,
      analysisStrategy: AnalysisStrategy.legacy,
      contextLayout: ContextLayout.single,
      contextSourceSet: ContextSourceSet.full,
      forkedFromWorkspaceId: null,
      forkRequestKey: null,
      comparisonGroupId: null,
      createdAt: new Date('2026-11-01T10:00:00Z'),
      ...overrides,
    };
    state.workspaces.push(row);
    return { row, folder };
  };

  // A completed X1 of the source: run, completed AiRun, registered `01a` on disk.
  const addSourceRequirements = (
    source: { row: Row; folder: string },
    content = JSON.stringify(FAKE_VACANCY_REQUIREMENTS_JSON, null, 2),
    runOverrides: Partial<Row> = {},
  ) => {
    const runId = `${source.row.id}-x1`;
    state.aiRuns.push({ id: `${runId}-ai`, status: 'completed' });
    state.promptRuns.push({
      id: runId,
      workspaceId: source.row.id,
      promptStep: 'analysis_x1',
      inputHash: 'x1-identity',
      aiRunId: `${runId}-ai`,
      ...runOverrides,
    });
    const filePath = path.join(source.folder, REQUIREMENTS_FILE);
    fs.writeFileSync(filePath, content, 'utf-8');
    state.artifacts.push({
      id: `${runId}-artifact`,
      workspaceId: source.row.id,
      promptRunId: runId,
      artifactType: ARTIFACT_TYPES.requirements,
      canonicalFileName: REQUIREMENTS_FILE,
      filePath,
      contentHash: sha256(content),
      isLatest: true,
      origin: 'analysis_x1',
      mimeType: 'application/json',
      downloadFileName: null,
    });
    return { runId, filePath, content };
  };

  const folderNames = () =>
    fs
      .readdirSync(storageRoot)
      .filter((name) => !name.startsWith('source_folder_'));
  const forksOf = (sourceId: string) =>
    state.workspaces.filter((row) => row.forkedFromWorkspaceId === sourceId);
  const rowCounts = () => ({
    workspaces: state.workspaces.length,
    companies: state.companies.length,
    vacancies: state.vacancies.length,
    notes: state.notes.length,
    artifacts: state.artifacts.length,
  });
  const cleanup = () =>
    fs.rmSync(storageRoot, { recursive: true, force: true });

  return {
    service,
    state,
    prisma,
    storage,
    storageRoot,
    artifactsService,
    addSource,
    addSourceRequirements,
    folderNames,
    forksOf,
    rowCounts,
    cleanup,
  };
};

type Harness = ReturnType<typeof createHarness>;

const dto = (overrides: Partial<ForkWorkspaceDto> = {}): ForkWorkspaceDto => ({
  analysisStrategy: AnalysisStrategy.c,
  ...overrides,
});

describe('WorkspaceForkService', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('forks a workspace from its source without running anything', async () => {
    const source = harness.addSource();
    harness.state.notes.push(
      {
        id: 'note-1',
        workspaceId: source.row.id,
        text: 'First note',
        isLegacy: true,
        createdAt: new Date('2026-11-01T10:05:00Z'),
      },
      {
        id: 'note-2',
        workspaceId: source.row.id,
        text: 'Second note',
        isLegacy: false,
        createdAt: new Date('2026-11-01T10:06:00Z'),
      },
    );
    harness.state.noteApplications.push({
      id: 'application-1',
      manualNoteId: 'note-1',
      promptRunId: 'source-run',
    });

    const result = await harness.service.fork(source.row.id, dto());

    const fork = harness.state.workspaces.find((row) => row.id === result.id);
    expect(fork).toMatchObject({
      status: WorkspaceStatus.source_saved,
      createdFrom: 'fork',
      analysisStrategy: AnalysisStrategy.c,
      contextLayout: ContextLayout.single,
      contextSourceSet: ContextSourceSet.full,
      forkedFromWorkspaceId: source.row.id,
      forkRequestKey: null,
      comparisonGroupId: source.row.id,
    });
    expect(source.row.comparisonGroupId).toBe(source.row.id);
    expect(result).toMatchObject({
      isNew: true,
      forkedFromWorkspaceId: source.row.id,
      comparisonGroupId: source.row.id,
      carryOverRequirements: false,
    });

    // A new JobVacancy whose 00 is the source's bytes, hashes asserted on both sides.
    const vacancy = harness.state.vacancies.find(
      (row) => row.id === fork?.jobVacancyId,
    );
    expect(vacancy?.id).not.toBe(source.row.jobVacancyId);
    expect(vacancy?.vacancyTextHash).toBe(sha256(VACANCY_BYTES));
    expect(result.vacancyTextHash).toBe(sha256(VACANCY_BYTES));
    const copied = fs.readFileSync(vacancy?.vacancyTextPath as string);
    expect(copied.equals(VACANCY_BYTES)).toBe(true);
    expect(
      harness.state.artifacts.filter((row) => row.workspaceId === result.id),
    ).toEqual([
      expect.objectContaining({
        artifactType: 'vacancy_source',
        contentHash: sha256(VACANCY_BYTES),
      }),
    ]);

    // Company and role values unchanged; only the workspace slug carries the discriminator.
    const company = harness.state.companies.find(
      (row) => row.id === fork?.companyId,
    );
    expect(company?.id).not.toBe(source.row.companyId);
    expect(company).toMatchObject({
      nameOriginal: 'Sample Company GmbH',
      companySlug: 'Sample_Company_GmbH',
    });
    expect(vacancy).toMatchObject({
      roleTitleOriginal: 'Senior Разработчик (Node.js)',
      roleSlug: 'Senior_Разработчик_Node_js',
      sourceUrl: 'https://example.com/job',
    });
    expect(result.workspaceSlug).toMatch(
      /^\d{4}_\d{2}_\d{2}_Sample_Company_GmbH_Senior_Разработчик_Node_js_fork_1$/u,
    );
    expect(harness.folderNames()).toEqual([result.workspaceSlug]);

    // Notes copied with their order, not their applications to the source's runs.
    expect(
      harness.state.notes
        .filter((note) => note.workspaceId === result.id)
        .map(({ text, isLegacy, createdAt }) => ({
          text,
          isLegacy,
          createdAt,
        })),
    ).toEqual([
      {
        text: 'First note',
        isLegacy: true,
        createdAt: new Date('2026-11-01T10:05:00Z'),
      },
      {
        text: 'Second note',
        isLegacy: false,
        createdAt: new Date('2026-11-01T10:06:00Z'),
      },
    ]);
    expect(harness.state.noteApplications).toHaveLength(1);

    // Nothing runs: no run or AiRun row, and the service cannot reach the queue or a provider.
    expect(harness.state.promptRuns).toEqual([]);
    expect(harness.state.aiRuns).toEqual([]);
    const dependencies = (
      Reflect.getMetadata('design:paramtypes', WorkspaceForkService) as {
        name: string;
      }[]
    ).map((type) => type.name);
    expect(dependencies).toEqual([
      'PrismaService',
      'ArtifactStorageService',
      'ArtifactsService',
      'CompanyService',
      'VacancyService',
    ]);
  });

  it('gives each fork of the same day its own discriminator in one group', async () => {
    const source = harness.addSource({ comparisonGroupId: 'group-root' });

    const first = await harness.service.fork(source.row.id, dto());
    const second = await harness.service.fork(
      source.row.id,
      dto({ analysisStrategy: AnalysisStrategy.b }),
    );

    expect(first.workspaceSlug).toMatch(/_fork_1$/);
    expect(second.workspaceSlug).toMatch(/_fork_2$/);
    expect([first.comparisonGroupId, second.comparisonGroupId]).toEqual([
      'group-root',
      'group-root',
    ]);
    expect(source.row.comparisonGroupId).toBe('group-root');
  });

  it('puts a fork of a fork into the group of the first source', async () => {
    const source = harness.addSource();
    const first = await harness.service.fork(source.row.id, dto());

    const second = await harness.service.fork(first.id, dto());

    expect(second.forkedFromWorkspaceId).toBe(first.id);
    expect(second.comparisonGroupId).toBe(source.row.id);
  });

  it('rejects a fork of an archived workspace', async () => {
    const archivedFlag = harness.addSource({ isArchived: true });
    const archivedStatus = harness.addSource({
      status: WorkspaceStatus.archived,
    });
    const before = harness.rowCounts();

    for (const source of [archivedFlag, archivedStatus]) {
      await expect(
        harness.service.fork(source.row.id, dto()),
      ).rejects.toBeInstanceOf(BadRequestException);
    }

    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([]);
  });

  it('rejects a fork of an unknown workspace', async () => {
    const before = harness.rowCounts();

    await expect(
      harness.service.fork('missing-workspace', dto()),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([]);
  });

  it('rejects a fork when the vacancy hash does not match', async () => {
    const changedFile = harness.addSource();
    fs.writeFileSync(
      path.join(changedFile.folder, '00_vacancy_source.txt'),
      Buffer.concat([VACANCY_BYTES, Buffer.from(' ')]),
    );
    const changedRecord = harness.addSource();
    const vacancy = harness.state.vacancies.find(
      (row) => row.id === changedRecord.row.jobVacancyId,
    ) as Row;
    vacancy.vacancyTextHash = sha256('another text');
    const before = harness.rowCounts();

    for (const source of [changedFile, changedRecord]) {
      await expect(harness.service.fork(source.row.id, dto())).rejects.toThrow(
        /does not match its recorded hash/,
      );
    }

    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([]);
  });

  it('rejects a fork when the vacancy source file is missing', async () => {
    const source = harness.addSource();
    fs.rmSync(path.join(source.folder, '00_vacancy_source.txt'));
    const before = harness.rowCounts();

    const refusal = harness.service.fork(source.row.id, dto());

    await expect(refusal).rejects.toBeInstanceOf(BadRequestException);
    await expect(refusal).rejects.toThrow(/is missing/);
    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([]);
  });

  it('copies no decision, approval or run', async () => {
    const source = harness.addSource({
      status: WorkspaceStatus.cv_draft_ready,
      currentDecision: 'apply',
      originalDecision: 'maybe',
      reviewState: 'approved',
      score: 81,
      lastStepErrorStep: 'prompt_2',
      analysisStrategy: AnalysisStrategy.c,
    });
    addAnalysisArtifacts(harness, source.row.id);
    harness.state.promptRuns.push({
      id: 'source-run',
      workspaceId: source.row.id,
      promptStep: 'prompt_1',
      aiRunId: 'source-ai',
    });

    const result = await harness.service.fork(source.row.id, dto());

    const fork = harness.state.workspaces.find((row) => row.id === result.id);
    expect(fork).toMatchObject({
      status: WorkspaceStatus.source_saved,
      currentDecision: null,
      originalDecision: null,
      reviewState: null,
      score: null,
      lastStepErrorStep: null,
    });
    expect(
      harness.state.promptRuns.filter((run) => run.workspaceId === result.id),
    ).toEqual([]);
    expect(
      harness.state.artifacts
        .filter((row) => row.workspaceId === result.id)
        .map((row) => row.artifactType),
    ).toEqual(['vacancy_source']);
    expect(harness.folderNames()).toEqual([result.workspaceSlug]);
    expect(
      fs.readdirSync(path.join(harness.storageRoot, result.workspaceSlug)),
    ).toEqual(['00_vacancy_source.txt']);
  });

  it('carries over a frozen 01a on request', async () => {
    const source = harness.addSource({ analysisStrategy: AnalysisStrategy.c });
    const { runId, content } = harness.addSourceRequirements(source);

    const result = await harness.service.fork(
      source.row.id,
      dto({ carryOverRequirements: true }),
    );

    expect(result.carryOverRequirements).toBe(true);
    const carried = harness.state.artifacts.find(
      (row) =>
        row.workspaceId === result.id &&
        row.artifactType === ARTIFACT_TYPES.requirements,
    );
    // The identity stays on the source's X1 run, which the carried artifact names.
    expect(carried).toMatchObject({
      promptRunId: runId,
      origin: CARRIED_OVER_ORIGIN,
      canonicalFileName: REQUIREMENTS_FILE,
      contentHash: sha256(content),
    });
    expect(fs.readFileSync(carried?.filePath as string, 'utf-8')).toBe(content);
    expect(path.dirname(carried?.filePath as string)).toBe(
      path.join(harness.storageRoot, result.workspaceSlug),
    );
    // Nothing else of the analysis is copied, and no run or AiRun is created.
    expect(harness.state.promptRuns).toHaveLength(1);
    expect(harness.state.aiRuns).toHaveLength(1);
    expect(
      harness.state.artifacts
        .filter((row) => row.workspaceId === result.id)
        .map((row) => row.artifactType)
        .sort(),
    ).toEqual([ARTIFACT_TYPES.requirements, 'vacancy_source'].sort());
  });

  it('rejects a carry-over without a c source 01a', async () => {
    const withRequirements = harness.addSource({
      analysisStrategy: AnalysisStrategy.c,
    });
    harness.addSourceRequirements(withRequirements);
    const withoutRequirements = harness.addSource({
      analysisStrategy: AnalysisStrategy.c,
    });
    const fromB = harness.addSource({ analysisStrategy: AnalysisStrategy.b });
    harness.addSourceRequirements(fromB, undefined, {
      promptStep: 'analysis_b',
    });
    const fromAnotherWorkspace = harness.addSource();
    harness.addSourceRequirements(fromAnotherWorkspace, undefined, {
      workspaceId: 'some-other-workspace',
    });
    const failedRun = harness.addSource();
    const failed = harness.addSourceRequirements(failedRun);
    (
      harness.state.aiRuns.find((row) => row.id === `${failed.runId}-ai`) as Row
    ).status = 'failed';
    const tampered = harness.addSource();
    const tamperedFile = harness.addSourceRequirements(tampered);
    fs.writeFileSync(tamperedFile.filePath, `${tamperedFile.content}\n`);
    const invalid = harness.addSource();
    harness.addSourceRequirements(invalid, '{}');
    const before = harness.rowCounts();

    await expect(
      harness.service.fork(
        withRequirements.row.id,
        dto({
          analysisStrategy: AnalysisStrategy.b,
          carryOverRequirements: true,
        }),
      ),
    ).rejects.toThrow(/needs strategy "c"/);
    const refused = [
      [withoutRequirements, /no registered 01a/],
      [fromB, /not produced by a completed X1 run/],
      [fromAnotherWorkspace, /not produced by a completed X1 run/],
      [failedRun, /not produced by a completed X1 run/],
      [tampered, /no longer matches the registered hash/],
      [invalid, /fails validation/],
    ] as const;
    for (const [source, reason] of refused) {
      await expect(
        harness.service.fork(
          source.row.id,
          dto({ carryOverRequirements: true }),
        ),
      ).rejects.toThrow(reason);
    }

    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([]);
  });

  it('returns the existing fork for a repeated request key', async () => {
    const source = harness.addSource();
    const first = await harness.service.fork(
      source.row.id,
      dto({ requestKey: REQUEST_KEY }),
    );
    const before = harness.rowCounts();

    const repeated = await harness.service.fork(
      source.row.id,
      dto({ requestKey: REQUEST_KEY }),
    );

    expect(repeated).toEqual({ ...first, isNew: false });
    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([first.workspaceSlug]);
    expect(harness.forksOf(source.row.id)).toHaveLength(1);
  });

  it('creates a new fork for another request key', async () => {
    const source = harness.addSource();
    const first = await harness.service.fork(
      source.row.id,
      dto({ requestKey: REQUEST_KEY }),
    );

    const second = await harness.service.fork(
      source.row.id,
      dto({ requestKey: OTHER_KEY }),
    );
    const withoutKey = await harness.service.fork(source.row.id, dto());

    expect(second.isNew).toBe(true);
    expect(second.id).not.toBe(first.id);
    expect(second.requestKey).toBe(OTHER_KEY);
    expect(withoutKey.requestKey).toBeNull();
    expect(harness.forksOf(source.row.id)).toHaveLength(3);
    expect(harness.folderNames()).toHaveLength(3);
  });

  it('rejects a reused request key with different options', async () => {
    const source = harness.addSource({ analysisStrategy: AnalysisStrategy.c });
    harness.addSourceRequirements(source);
    await harness.service.fork(source.row.id, dto({ requestKey: REQUEST_KEY }));
    const before = harness.rowCounts();

    const different = [
      dto({ requestKey: REQUEST_KEY, analysisStrategy: AnalysisStrategy.b }),
      dto({ requestKey: REQUEST_KEY, contextLayout: ContextLayout.boundary }),
      dto({
        requestKey: REQUEST_KEY,
        contextSourceSet: ContextSourceSet.assessment,
      }),
      dto({ requestKey: REQUEST_KEY, carryOverRequirements: true }),
    ];
    for (const request of different) {
      await expect(
        harness.service.fork(source.row.id, request),
      ).rejects.toBeInstanceOf(ConflictException);
    }

    expect(harness.rowCounts()).toEqual(before);
    expect(harness.forksOf(source.row.id)).toHaveLength(1);
    expect(harness.folderNames()).toHaveLength(1);
  });

  it('returns the concurrent fork on a request key conflict', async () => {
    const source = harness.addSource();
    const other = await harness.service.fork(
      source.row.id,
      dto({ requestKey: REQUEST_KEY }),
    );
    // The other request committed between this request's lookup and its insert.
    harness.prisma.applicationWorkspace.findFirst.mockResolvedValueOnce(null);

    const result = await harness.service.fork(
      source.row.id,
      dto({ requestKey: REQUEST_KEY }),
    );

    expect(harness.prisma.applicationWorkspace.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ...other, isNew: false });
    expect(harness.forksOf(source.row.id)).toHaveLength(1);
    // The losing request's folder and rows are gone.
    expect(harness.folderNames()).toEqual([other.workspaceSlug]);
    expect(harness.state.companies).toHaveLength(2);
    expect(harness.state.vacancies).toHaveLength(2);
  });

  it('does not take another unique violation for a repeated request', async () => {
    const source = harness.addSource();
    harness.prisma.applicationWorkspace.create.mockRejectedValueOnce(
      uniqueViolation(['workspaceSlug']),
    );
    const before = harness.rowCounts();

    await expect(
      harness.service.fork(source.row.id, dto({ requestKey: REQUEST_KEY })),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(harness.rowCounts()).toEqual(before);
    expect(harness.folderNames()).toEqual([]);
    // Only the pre-insert lookup ran: the slug conflict was not answered with an existing fork.
    expect(harness.prisma.applicationWorkspace.findFirst).toHaveBeenCalledTimes(
      1,
    );
  });

  it('removes the fork folder when the transaction fails', async () => {
    const source = harness.addSource();
    harness.state.notes.push({
      id: 'note-1',
      workspaceId: source.row.id,
      text: 'A note',
      isLegacy: false,
      createdAt: new Date(),
    });
    const failure = new Error('database went away');
    harness.artifactsService.register.mockRejectedValueOnce(failure);
    const before = harness.rowCounts();

    await expect(harness.service.fork(source.row.id, dto())).rejects.toBe(
      failure,
    );

    expect(harness.rowCounts()).toEqual(before);
    // The rolled-back state, read again: the group id written to the source is gone too.
    expect(
      harness.state.workspaces.find((row) => row.id === source.row.id)
        ?.comparisonGroupId,
    ).toBeNull();
    expect(harness.folderNames()).toEqual([]);
  });

  it('still throws the original error when removing the folder fails', async () => {
    const source = harness.addSource();
    const failure = new Error('insert failed');
    harness.prisma.applicationWorkspace.create.mockRejectedValueOnce(failure);
    jest
      .spyOn(harness.storage, 'removeWorkspaceFolder')
      .mockRejectedValueOnce(new Error('EBUSY'));

    await expect(harness.service.fork(source.row.id, dto())).rejects.toBe(
      failure,
    );
  });
});

// The 01-family artifacts a completed analysis leaves behind; a source fork copies none of them.
const addAnalysisArtifacts = (harness: Harness, workspaceId: string) => {
  for (const [artifactType, canonicalFileName] of [
    ['vacancy_analysis_json', '01_vacancy_analysis.json'],
    [ARTIFACT_TYPES.requirements, REQUIREMENTS_FILE],
    [ARTIFACT_TYPES.assessment, '01b_fit_assessment.json'],
    [ARTIFACT_TYPES.decision, '01c_analysis_decision.json'],
  ]) {
    harness.state.artifacts.push({
      id: `${workspaceId}-${artifactType}`,
      workspaceId,
      promptRunId: 'source-run',
      artifactType,
      canonicalFileName,
      isLatest: true,
      origin: 'analysis_x2',
    });
  }
};
