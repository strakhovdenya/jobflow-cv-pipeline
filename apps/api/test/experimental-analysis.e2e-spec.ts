import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be set before AppModule (and its ConfigModule/dotenv load) is imported, so the app never
// touches the real storage folder or a real AI provider. dotenv does not override variables
// already present in process.env.
const testStorageRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-experimental-e2e-'),
);
const testKnowledgeSourcesRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-experimental-e2e-knowledge-'),
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
  PromptRunStatus,
  WorkspaceStatus,
} from '@prisma/client';
import {
  SeededTemplateChangedError,
  promptTemplates,
  seedPromptTemplates,
} from '../prisma/seed';
import { AppModule } from '../src/app.module';
import { KnowledgeSourcesService } from '../src/knowledge-sources/knowledge-sources.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createKnowledgeSourceFixture,
  createRegistryKnowledgeSourceFixtures,
} from './knowledge-source-fixture.helper';
import { runAiStep } from './run-ai-step.helper';

// The experimental `prompt_1` job path (ADR-046, ISSUE-714 INV-7) with the fake provider and the
// templates `prisma db seed` stored: a `c` workspace runs X1 and X2 with the seeded experimental
// templates, a legacy workspace runs the seeded `prompt_1` template only. The seed's refusal to
// change a stored experimental version (INV-9) is checked against the same real Postgres.

const EXPERIMENTAL_ARTIFACT_TYPES = [
  'vacancy_requirements_json',
  'fit_assessment_json',
  'analysis_decision_json',
];
const LEGACY_ANALYSIS_TYPE = 'vacancy_analysis_json';
const SEED_STEP_PREFIX = 'e2e-experimental-seed-';

// Synthetic sources the experimental stages need besides the shared fixtures: cv_rules with the
// AI-weight section X1 reads, and career cases the evidence catalog is built from.
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
    contentHash: createHash('sha256').update(content, 'utf-8').digest('hex'),
    versionLabel: 'e2e-fixture',
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

const experimentalSources = (): KnowledgeSource[] => [
  writeSource(
    'e2e-experimental-cv-rules',
    'cv_rules',
    [
      '# Sample CV rules',
      '',
      '## AI-assisted engineering: weight and kind',
      '',
      'Sample weight rule for AI requests.',
      '',
      '## Layout',
      '',
      'Sample layout rule.',
      '',
    ].join('\n'),
  ),
  writeSource(
    'e2e-experimental-career-cases',
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

const seededTemplate = (step: string) => {
  const template = promptTemplates.find(
    (item) => item.step === step && item.isActive,
  );
  if (!template) throw new Error(`No active seed template for ${step}`);
  return template;
};

describe('Experimental analysis (e2e, fake provider, seeded templates)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  const created: Array<{
    workspaceId: string;
    companyId: string;
    jobVacancyId: string;
  }> = [];

  const createWorkspace = async (roleTitle: string): Promise<string> => {
    const res = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: {
        [API_KEY_HEADER]: API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyNameOriginal: 'Sample Experimental Company',
        roleTitleOriginal: roleTitle,
        vacancyText:
          'We are looking for a Backend Developer with Node.js and TypeScript experience to build REST APIs.',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      companyId: string;
      jobVacancyId: string;
    };
    created.push({
      workspaceId: body.id,
      companyId: body.companyId,
      jobVacancyId: body.jobVacancyId,
    });
    return body.id;
  };

  const cleanSeedRows = () =>
    prisma.promptTemplate.deleteMany({
      where: { step: { startsWith: SEED_STEP_PREFIX } },
    });

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
    // A real listening port: workspaces are created over HTTP with `fetch`.
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();

    prisma = app.get(PrismaService);
    await cleanSeedRows();
  });

  afterAll(async () => {
    await cleanSeedRows();
    for (const { workspaceId, companyId, jobVacancyId } of created) {
      await prisma.generatedArtifact.deleteMany({ where: { workspaceId } });
      const promptRuns = await prisma.promptRun.findMany({
        where: { workspaceId },
        select: { aiRunId: true },
      });
      await prisma.promptRun.deleteMany({ where: { workspaceId } });
      const aiRunIds = promptRuns
        .map((run) => run.aiRunId)
        .filter((id): id is string => !!id);
      if (aiRunIds.length > 0) {
        await prisma.aiRun.deleteMany({ where: { id: { in: aiRunIds } } });
      }
      await prisma.applicationWorkspace.delete({ where: { id: workspaceId } });
      await prisma.jobVacancy.delete({ where: { id: jobVacancyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }

    await app.close();
    fs.rmSync(testStorageRoot, { recursive: true, force: true });
    fs.rmSync(testKnowledgeSourcesRoot, { recursive: true, force: true });
  });

  it('runs a c workspace through the prompt_1 job with the seeded templates', async () => {
    const workspaceId = await createWorkspace('Backend Developer Strategy C');
    await prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { analysisStrategy: AnalysisStrategy.c },
    });

    await runAiStep(app, API_KEY, workspaceId, 'run-analysis');

    const workspace = await prisma.applicationWorkspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    expect(workspace.status).toBe(WorkspaceStatus.paused_after_analysis);
    expect(workspace.lastStepErrorStep).toBeNull();

    // X1 and X2 completed, each with the active template `prisma db seed` stored for its stage,
    // whose content is the composed seed text.
    const runs = await prisma.promptRun.findMany({
      where: { workspaceId },
      include: { template: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(runs.map((run) => run.promptStep)).toEqual([
      'analysis_x1',
      'analysis_x2',
    ]);
    for (const run of runs) {
      const seeded = seededTemplate(run.promptStep);
      expect(run.status).toBe(PromptRunStatus.completed);
      expect(run.aiRunId).not.toBeNull();
      expect(run.template.id).toBe(seeded.id);
      expect(run.template.isActive).toBe(true);
      expect(run.template.version).toBe(seeded.version);
      expect(run.template.content).toBe(seeded.content);
    }

    // `01a`, `01b`, `01c` and the legacy projection `01` are registered and on disk.
    const artifacts = await prisma.generatedArtifact.findMany({
      where: { workspaceId, isLatest: true },
    });
    const byType = new Map(artifacts.map((item) => [item.artifactType, item]));
    expect(
      [...EXPERIMENTAL_ARTIFACT_TYPES, LEGACY_ANALYSIS_TYPE].map(
        (type) => byType.get(type)?.canonicalFileName,
      ),
    ).toEqual([
      '01a_vacancy_requirements.json',
      '01b_fit_assessment.json',
      '01c_analysis_decision.json',
      '01_vacancy_analysis.json',
    ]);
    for (const artifact of artifacts) {
      const absPath = path.resolve(artifact.storageRoot, artifact.filePath);
      expect(fs.existsSync(absPath)).toBe(true);
    }
  });

  it('runs a legacy workspace through the prompt_1 job with the prompt_1 template only', async () => {
    const workspaceId = await createWorkspace('Backend Developer Legacy');
    const before = await prisma.applicationWorkspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    expect(before.analysisStrategy).toBe(AnalysisStrategy.legacy);

    await runAiStep(app, API_KEY, workspaceId, 'run-analysis');

    const workspace = await prisma.applicationWorkspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    expect(workspace.status).toBe(WorkspaceStatus.paused_after_analysis);

    const runs = await prisma.promptRun.findMany({
      where: { workspaceId },
      include: { template: true },
    });
    const prompt1 = seededTemplate('prompt_1');
    expect(runs.map((run) => run.promptStep)).toEqual(['prompt_1']);
    expect(runs[0].template.id).toBe(prompt1.id);
    expect(runs[0].template.content).toBe(prompt1.content);

    const types = (
      await prisma.generatedArtifact.findMany({ where: { workspaceId } })
    ).map((artifact) => artifact.artifactType);
    expect(types).toContain(LEGACY_ANALYSIS_TYPE);
    expect(
      types.filter((type) => EXPERIMENTAL_ARTIFACT_TYPES.includes(type)),
    ).toEqual([]);
  });

  it('refuses to overwrite a seeded experimental template version', async () => {
    const seeded = seededTemplate('analysis_x1');
    const template = {
      ...seeded,
      id: `${SEED_STEP_PREFIX}${seeded.id}`,
      step: `${SEED_STEP_PREFIX}${seeded.step}`,
    };

    await seedPromptTemplates(prisma, [template]);
    await seedPromptTemplates(prisma, [template]);

    const changed = { ...template, content: `${template.content}\nChanged.` };
    await expect(seedPromptTemplates(prisma, [changed])).rejects.toBeInstanceOf(
      SeededTemplateChangedError,
    );

    const stored = await prisma.promptTemplate.findUniqueOrThrow({
      where: { id: template.id },
    });
    expect(stored.content).toBe(seeded.content);
    expect(stored.isActive).toBe(true);
  });
});
