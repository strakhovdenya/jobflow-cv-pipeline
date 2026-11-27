import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be set before AppModule (and its ConfigModule/dotenv load) is imported, so the app never
// touches the real storage folder or a real AI provider. dotenv does not override variables
// already present in process.env.
const testStorageRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-fork-e2e-'),
);
const testKnowledgeSourcesRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-fork-e2e-knowledge-'),
);
process.env.STORAGE_ROOT = testStorageRoot;
process.env.KNOWLEDGE_SOURCES_ROOT = testKnowledgeSourcesRoot;
process.env.AI_PROVIDER = 'fake';
process.env.API_KEY = 'test-api-key';
// Own BullMQ prefix so a dev server sharing this Redis never picks up the e2e jobs.
process.env.QUEUE_PREFIX = 'jobflow-e2e';

const API_KEY = 'test-api-key';
const API_KEY_HEADER = 'X-API-Key';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AnalysisStrategy,
  KnowledgeSource,
  WorkspaceStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { KnowledgeSourcesService } from '../src/knowledge-sources/knowledge-sources.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createKnowledgeSourceFixture,
  createRegistryKnowledgeSourceFixtures,
} from './knowledge-source-fixture.helper';
import { runAiStep } from './run-ai-step.helper';

// The source fork of ADR-046 item 8 (ISSUE-716) over HTTP against the real database, the real
// queue and the fake provider: a fork copies the vacancy and runs nothing; a `c` fork with the
// carried-over `01a` of a completed source analysis runs only X2; the request key and the
// comparison group hold under concurrent requests (the unique index and the group write are
// database behaviour, which a unit test cannot show).

const VACANCY_TEXT =
  'We are looking for a Backend Developer with Node.js and TypeScript experience to build REST APIs.\r\nРазработчик — remote.';
const sha256 = (data: Buffer | string) =>
  createHash('sha256').update(data).digest('hex');

const writeSource = (
  id: string,
  sourceType: string,
  content: string,
): KnowledgeSource => {
  const filePath = path.join(testKnowledgeSourcesRoot, `${id}.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
  const now = new Date();
  return {
    id,
    filePath,
    sourceType,
    isActive: true,
    contentHash: sha256(content),
    versionLabel: 'e2e-fixture',
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

// Synthetic sources the experimental stages need besides the shared fixtures.
const experimentalSources = (): KnowledgeSource[] => [
  writeSource(
    'e2e-fork-cv-rules',
    'cv_rules',
    [
      '# Sample CV rules',
      '',
      '## AI-assisted engineering: weight and kind',
      '',
      'Sample weight rule for AI requests.',
      '',
    ].join('\n'),
  ),
  writeSource(
    'e2e-fork-career-cases',
    'career_cases',
    [
      '# Case 1 — Sample integration service',
      '',
      '## 1. Context',
      '',
      'Sample commercial integration work.',
      '',
    ].join('\n'),
  ),
];

interface ForkBody {
  id: string;
  isNew: boolean;
  status: WorkspaceStatus;
  workspaceSlug: string;
  comparisonGroupId: string;
  carryOverRequirements: boolean;
  vacancyTextHash: string;
}

describe('Workspace source fork (e2e, real database, fake provider)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  const createdWorkspaceIds: string[] = [];

  const call = async (
    method: 'GET' | 'POST',
    route: string,
    body?: unknown,
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        [API_KEY_HEADER]: API_KEY,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      body: (await res.json()) as Record<string, unknown>,
    };
  };

  const createSource = async (roleTitle: string): Promise<string> => {
    const res = await call('POST', '/workspaces', {
      companyNameOriginal: 'Sample Fork Company',
      roleTitleOriginal: roleTitle,
      vacancyText: VACANCY_TEXT,
    });
    expect(res.status).toBe(201);
    const id = res.body.id as string;
    createdWorkspaceIds.push(id);
    return id;
  };

  const fork = async (sourceId: string, body: Record<string, unknown>) => {
    const res = await call('POST', `/workspaces/${sourceId}/fork`, body);
    if (res.status === 201) {
      const id = res.body.id as string;
      if (!createdWorkspaceIds.includes(id)) createdWorkspaceIds.push(id);
    }
    return res;
  };

  const promptStepsOf = async (workspaceId: string) =>
    (
      await prisma.promptRun.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'asc' },
      })
    ).map((run) => run.promptStep);

  const forkFolderNames = (sourceSlugPart: string) =>
    fs
      .readdirSync(testStorageRoot)
      .filter(
        (name) => name.includes(sourceSlugPart) && /_fork_\d+$/.test(name),
      );

  beforeAll(async () => {
    const fixtureKnowledgeSources = [
      createKnowledgeSourceFixture(testKnowledgeSourcesRoot),
      ...createRegistryKnowledgeSourceFixtures(testKnowledgeSourcesRoot),
      ...experimentalSources(),
    ];

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KnowledgeSourcesService)
      .useValue({ findActive: async () => fixtureKnowledgeSources })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Forks reference their source, so the newest workspace goes first.
    const workspaces = await prisma.applicationWorkspace.findMany({
      where: { id: { in: createdWorkspaceIds } },
      orderBy: { createdAt: 'desc' },
    });
    for (const workspace of workspaces) {
      const runs = await prisma.promptRun.findMany({
        where: { workspaceId: workspace.id },
        select: { id: true, aiRunId: true },
      });
      const runIds = runs.map((run) => run.id);
      await prisma.manualNoteApplication.deleteMany({
        where: { promptRunId: { in: runIds } },
      });
      await prisma.manualNote.deleteMany({
        where: { workspaceId: workspace.id },
      });
      await prisma.generatedArtifact.deleteMany({
        where: { workspaceId: workspace.id },
      });
      await prisma.promptRun.deleteMany({
        where: { workspaceId: workspace.id },
      });
      const aiRunIds = runs
        .map((run) => run.aiRunId)
        .filter((id): id is string => !!id);
      await prisma.aiRun.deleteMany({ where: { id: { in: aiRunIds } } });
      await prisma.applicationWorkspace.updateMany({
        where: { forkedFromWorkspaceId: workspace.id },
        data: { forkedFromWorkspaceId: null },
      });
      await prisma.applicationWorkspace.delete({ where: { id: workspace.id } });
      await prisma.jobVacancy.delete({ where: { id: workspace.jobVacancyId } });
      await prisma.company.delete({ where: { id: workspace.companyId } });
    }

    await app.close();
    fs.rmSync(testStorageRoot, { recursive: true, force: true });
    fs.rmSync(testKnowledgeSourcesRoot, { recursive: true, force: true });
  });

  it('forks a workspace over HTTP and runs nothing', async () => {
    const sourceId = await createSource('Backend Developer Fork Basic');
    await call('POST', `/workspaces/${sourceId}/manual-note`, {
      note: 'A sample manual note.',
    });

    const res = await fork(sourceId, { analysisStrategy: 'c' });

    expect(res.status).toBe(201);
    const body = res.body as unknown as ForkBody;
    expect(body.id).toEqual(expect.any(String));
    expect(body.status).toBe(WorkspaceStatus.source_saved);
    expect(body.comparisonGroupId).toBe(sourceId);

    const [source, forked] = await Promise.all(
      [sourceId, body.id].map((id) =>
        prisma.applicationWorkspace.findUniqueOrThrow({
          where: { id },
          include: { company: true, jobVacancy: true },
        }),
      ),
    );
    const sourceBytes = fs.readFileSync(source.jobVacancy.vacancyTextPath);
    const forkBytes = fs.readFileSync(forked.jobVacancy.vacancyTextPath);
    expect(forkBytes.equals(sourceBytes)).toBe(true);
    expect(forked.jobVacancy.vacancyTextHash).toBe(sha256(sourceBytes));
    expect(forked.jobVacancy.vacancyTextHash).toBe(
      source.jobVacancy.vacancyTextHash,
    );
    expect(forked.jobVacancyId).not.toBe(source.jobVacancyId);
    expect(forked.company.nameOriginal).toBe(source.company.nameOriginal);
    expect(forked.company.companySlug).toBe(source.company.companySlug);
    expect(forked.jobVacancy.roleSlug).toBe(source.jobVacancy.roleSlug);
    expect(forked).toMatchObject({
      analysisStrategy: AnalysisStrategy.c,
      forkedFromWorkspaceId: sourceId,
      comparisonGroupId: sourceId,
      currentDecision: null,
    });
    expect(source.comparisonGroupId).toBe(sourceId);
    const notes = await prisma.manualNote.findMany({
      where: { workspaceId: body.id },
    });
    expect(notes.map((note) => note.text)).toEqual(['A sample manual note.']);

    // Nothing ran: no run, and no open job for the fork.
    expect(await promptStepsOf(body.id)).toEqual([]);
    const detail = await call('GET', `/workspaces/${body.id}`);
    expect(detail.body).toMatchObject({
      status: WorkspaceStatus.source_saved,
      analysisStrategy: 'c',
      contextLayout: 'single',
      contextSourceSet: 'full',
      forkedFromWorkspaceId: sourceId,
      activeJob: null,
      sourcesChangedSinceAnalysis: false,
    });
    expect(detail.body).not.toHaveProperty('analysisPolicy');
  });

  it('rejects an unknown strategy and an unknown workspace', async () => {
    const sourceId = await createSource('Backend Developer Fork Invalid');

    const unknownStrategy = await fork(sourceId, { analysisStrategy: 'd' });
    const unknownWorkspace = await fork('no-such-workspace', {
      analysisStrategy: 'b',
    });

    expect(unknownStrategy.status).toBe(400);
    expect(unknownWorkspace.status).toBe(404);
    expect(
      await prisma.applicationWorkspace.count({
        where: { forkedFromWorkspaceId: sourceId },
      }),
    ).toBe(0);
  });

  it('runs only X2 in a fork with carried-over requirements', async () => {
    const rootId = await createSource('Backend Developer Fork CarryOver');
    const sourceFork = await fork(rootId, { analysisStrategy: 'c' });
    const sourceId = sourceFork.body.id as string;
    await runAiStep(app, API_KEY, sourceId, 'run-analysis');
    expect(await promptStepsOf(sourceId)).toEqual([
      'analysis_x1',
      'analysis_x2',
    ]);

    const carried = await fork(sourceId, {
      analysisStrategy: 'c',
      contextLayout: 'boundary',
      carryOverRequirements: true,
    });
    const fresh = await fork(sourceId, { analysisStrategy: 'c' });
    expect(carried.status).toBe(201);
    expect(carried.body.carryOverRequirements).toBe(true);
    expect(fresh.body.carryOverRequirements).toBe(false);
    const carriedId = carried.body.id as string;
    const freshId = fresh.body.id as string;

    await runAiStep(app, API_KEY, carriedId, 'run-analysis');
    await runAiStep(app, API_KEY, freshId, 'run-analysis');

    expect(await promptStepsOf(carriedId)).toEqual(['analysis_x2']);
    expect(await promptStepsOf(freshId)).toEqual([
      'analysis_x1',
      'analysis_x2',
    ]);
    const sourceX1 = await prisma.promptRun.findFirstOrThrow({
      where: { workspaceId: sourceId, promptStep: 'analysis_x1' },
    });
    const carriedRequirements = await prisma.generatedArtifact.findFirstOrThrow(
      {
        where: {
          workspaceId: carriedId,
          artifactType: 'vacancy_requirements_json',
          isLatest: true,
        },
      },
    );
    expect(carriedRequirements).toMatchObject({
      promptRunId: sourceX1.id,
      origin: 'carried_over',
    });
    const carriedWorkspace =
      await prisma.applicationWorkspace.findUniqueOrThrow({
        where: { id: carriedId },
      });
    expect(carriedWorkspace.status).toBe(WorkspaceStatus.paused_after_analysis);

    // The detail shows the policy result; the comparison counts the X1 call in the source only.
    const detail = await call('GET', `/workspaces/${carriedId}`);
    expect(detail.body.analysisPolicy).toEqual(
      expect.objectContaining({
        decision: expect.any(String),
        advisoryDecision: expect.any(String),
        borderline: expect.any(Boolean),
        manualReviewRequired: expect.any(Boolean),
        decidingRule: expect.any(String),
        openQuestions: expect.any(Array),
      }),
    );
    const comparison = await call('GET', `/workspaces/${carriedId}/comparison`);
    expect(comparison.status).toBe(200);
    const members = comparison.body.members as Array<{
      workspaceId: string;
      carryOverRequirements: boolean;
      stages: Array<{
        stepKey: string;
        isCarriedOver: boolean;
        callCount: number;
      }>;
      totals: { callCount: number };
    }>;
    expect(members.map((member) => member.workspaceId).sort()).toEqual(
      [rootId, sourceId, carriedId, freshId].sort(),
    );
    const carriedMember = members.find(
      (member) => member.workspaceId === carriedId,
    );
    expect(carriedMember?.carryOverRequirements).toBe(true);
    expect(carriedMember?.stages).toEqual([
      expect.objectContaining({
        stepKey: 'analysis_x1',
        isCarriedOver: true,
        callCount: 0,
      }),
      expect.objectContaining({ stepKey: 'analysis_x2', callCount: 1 }),
    ]);
    expect(carriedMember?.totals.callCount).toBe(1);
    expect(
      members.find((member) => member.workspaceId === sourceId)?.totals
        .callCount,
    ).toBe(2);
    expect(comparison.body.inputEquality).toMatchObject({
      vacancyHash: { isEqual: true },
      companyAndRole: { isEqual: true },
      notes: { isEqual: true },
    });
  });

  it('returns one fork for concurrent requests with one key', async () => {
    const sourceId = await createSource(
      'Backend Developer Fork Concurrent Key',
    );
    const requestKey = randomUUID();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        fork(sourceId, { analysisStrategy: 'b', requestKey }),
      ),
    );

    expect(responses.map((res) => res.status)).toEqual([
      201, 201, 201, 201, 201,
    ]);
    const ids = new Set(responses.map((res) => res.body.id));
    expect(ids.size).toBe(1);
    expect(responses.filter((res) => res.body.isNew === true)).toHaveLength(1);
    const forks = await prisma.applicationWorkspace.findMany({
      where: { forkedFromWorkspaceId: sourceId },
    });
    expect(forks).toHaveLength(1);
    expect(forks[0].forkRequestKey).toBe(requestKey);
    expect(forkFolderNames('Concurrent_Key')).toEqual([forks[0].workspaceSlug]);
    // No orphaned vacancy or company of a losing request.
    expect(
      await prisma.jobVacancy.count({
        where: { roleTitleOriginal: 'Backend Developer Fork Concurrent Key' },
      }),
    ).toBe(2);

    // The same key with other options is a conflict and creates nothing.
    const conflict = await fork(sourceId, {
      analysisStrategy: 'c',
      requestKey,
    });
    expect(conflict.status).toBe(409);
    expect(
      await prisma.applicationWorkspace.count({
        where: { forkedFromWorkspaceId: sourceId },
      }),
    ).toBe(1);
  });

  it('puts concurrent first forks into one group', async () => {
    const sourceId = await createSource(
      'Backend Developer Fork Concurrent Group',
    );

    const responses = await Promise.all(
      ['legacy', 'b', 'c', 'c'].map((analysisStrategy) =>
        fork(sourceId, { analysisStrategy }),
      ),
    );

    expect(responses.map((res) => res.status)).toEqual([201, 201, 201, 201]);
    const forks = await prisma.applicationWorkspace.findMany({
      where: { forkedFromWorkspaceId: sourceId },
    });
    expect(forks).toHaveLength(4);
    expect(new Set(forks.map((row) => row.workspaceSlug)).size).toBe(4);
    for (const row of forks) expect(row.comparisonGroupId).toBe(sourceId);
    const source = await prisma.applicationWorkspace.findUniqueOrThrow({
      where: { id: sourceId },
    });
    expect(source.comparisonGroupId).toBe(sourceId);
    const comparison = await call('GET', `/workspaces/${sourceId}/comparison`);
    expect((comparison.body.members as unknown[]).length).toBe(5);
  });
});
