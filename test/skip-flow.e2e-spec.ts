import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be set before AppModule (and its ConfigModule/dotenv load) is imported,
// so the app never touches the real storage/applications folder or a real
// AI provider. dotenv does not override variables already present in
// process.env, so these values win over whatever is in .env.
const testStorageRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-skip-e2e-'),
);
process.env.STORAGE_ROOT = testStorageRoot;
process.env.AI_PROVIDER = 'fake';
process.env.API_KEY = 'test-api-key';

const API_KEY_HEADER = 'X-API-Key';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// tsconfig has no esModuleInterop, and supertest's `export =` typing needs
// this form to keep the default export callable (`request(app.getHttpServer())`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Skip flow (e2e, fake provider)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workspaceId: string;
  let companyId: string;
  let jobVacancyId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.generatedArtifact.deleteMany({ where: { workspaceId } });
      const promptRuns = await prisma.promptRun.findMany({
        where: { workspaceId },
        select: { id: true, aiRunId: true },
      });
      await prisma.promptRun.deleteMany({ where: { workspaceId } });
      const aiRunIds = promptRuns
        .map((run) => run.aiRunId)
        .filter((id): id is string => !!id);
      if (aiRunIds.length > 0) {
        await prisma.aiRun.deleteMany({ where: { id: { in: aiRunIds } } });
      }
      await prisma.applicationWorkspace.delete({ where: { id: workspaceId } });
    }
    if (jobVacancyId) {
      await prisma.jobVacancy.delete({ where: { id: jobVacancyId } });
    }
    if (companyId) {
      await prisma.company.delete({ where: { id: companyId } });
    }

    await app.close();
    fs.rmSync(testStorageRoot, { recursive: true, force: true });
  });

  it('overrides an apply/maybe decision to skip and stops the pipeline (ADR-005, ADR-016)', async () => {
    // 1. Create workspace + run analysis (fake provider always recommends "apply")
    const createRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set(API_KEY_HEADER, 'test-api-key')
      .send({
        companyNameOriginal: 'Fake Skip Company',
        roleTitleOriginal: 'Backend Developer',
        vacancyText:
          'We are looking for a Backend Developer with strong Node.js and TypeScript experience to build REST APIs.',
      })
      .expect(201);

    workspaceId = createRes.body.id;
    companyId = createRes.body.companyId;
    jobVacancyId = createRes.body.jobVacancyId;

    const analysisRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/run-analysis`)
      .set(API_KEY_HEADER, 'test-api-key')
      .expect(201);

    expect(analysisRes.body.workspaceStatus).toBe('paused_after_analysis');

    // 2. Override to skip (ADR-016): status must stay "paused_after_analysis"
    //    until skip artifacts are physically created — only currentDecision
    //    and reviewState change at this step.
    const changeToSkipRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/review-decision`)
      .set(API_KEY_HEADER, 'test-api-key')
      .send({ action: 'change_to_skip' })
      .expect(201);

    expect(changeToSkipRes.body.currentDecision).toBe('skip');
    expect(changeToSkipRes.body.reviewState).toBe('overridden');
    expect(changeToSkipRes.body.status).toBe('paused_after_analysis');

    const workspaceAfterOverride = await prisma.applicationWorkspace.findUnique(
      {
        where: { id: workspaceId },
      },
    );
    expect(workspaceAfterOverride?.status).toBe('paused_after_analysis');
    expect(workspaceAfterOverride?.currentDecision).toBe('skip');

    // NOTE: confirm-skip (which would create 01_skip_reason.md/json and
    // transition status to "skipped", per ADR-005) is intentionally not
    // exercised here — it requires an active "skip_reason" PromptTemplate,
    // which prisma/seed.ts does not currently seed. That is a pre-existing
    // product gap discovered during TASK-PH-017, out of scope for this task
    // (coverage/CI strategy); see project-management/TASK_BOARD.md follow-up
    // note. This test covers the ADR-016 two-step transition only.
  }, 60000);
});
