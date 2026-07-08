import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be set before AppModule (and its ConfigModule/dotenv load) is imported,
// so the app never touches the real storage/applications folder or a real
// AI provider. dotenv does not override variables already present in
// process.env, so these values win over whatever is in .env.
const testStorageRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-mvp-e2e-'),
);
process.env.STORAGE_ROOT = testStorageRoot;
process.env.AI_PROVIDER = 'fake';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// tsconfig has no esModuleInterop, and supertest's `export =` typing needs
// this form to keep the default export callable (`request(app.getHttpServer())`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MVP flow (e2e, fake provider)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workspaceId: string;
  let companyId: string;
  let jobVacancyId: string;
  let workspaceFolderAbsPath: string;

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
      await prisma.decisionOverride.deleteMany({ where: { workspaceId } });
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

  it('runs the full mechanical MVP flow with the fake provider', async () => {
    // 1. Create workspace
    const createRes = await request(app.getHttpServer())
      .post('/workspaces')
      .send({
        companyNameOriginal: 'Fake Company',
        roleTitleOriginal: 'Backend Developer',
        vacancyText:
          'We are looking for a Backend Developer with strong Node.js and TypeScript experience to build REST APIs.',
      })
      .expect(201);

    workspaceId = createRes.body.id;
    companyId = createRes.body.companyId;
    jobVacancyId = createRes.body.jobVacancyId;
    expect(createRes.body.status).toBe('source_saved');

    workspaceFolderAbsPath = path.join(
      testStorageRoot,
      createRes.body.folderPath,
    );
    expect(
      fs.existsSync(path.join(workspaceFolderAbsPath, '00_vacancy_source.txt')),
    ).toBe(true);

    // 2. Run Prompt 1 analysis
    const analysisRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/run-analysis`)
      .expect(201);

    expect(analysisRes.body.success).toBe(true);
    expect(analysisRes.body.workspaceStatus).toBe('paused_after_analysis');
    expect(
      fs.existsSync(
        path.join(workspaceFolderAbsPath, '01_vacancy_analysis.md'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspaceFolderAbsPath, '01_vacancy_analysis.json'),
      ),
    ).toBe(true);

    const artifactsAfterAnalysis = await prisma.generatedArtifact.findMany({
      where: { workspaceId },
    });
    expect(
      artifactsAfterAnalysis.some(
        (a) => a.canonicalFileName === '01_vacancy_analysis.json',
      ),
    ).toBe(true);

    // 3. Approve apply
    const decisionRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/review-decision`)
      .send({ action: 'approve_apply' })
      .expect(201);

    expect(decisionRes.body.status).toBe('cv_generation_running');
    expect(decisionRes.body.canProceedToPrompt2).toBe(true);

    // 4. Generate CV content (Prompt 2) + anti-overclaiming guard
    const cvGenRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generate-cv-content`)
      .expect(201);

    expect(cvGenRes.body.success).toBe(true);
    expect(cvGenRes.body.workspaceStatus).toBe('cv_draft_ready');
    expect(
      fs.existsSync(
        path.join(workspaceFolderAbsPath, '02_targeted_cv_content.md'),
      ),
    ).toBe(true);
    const cvJsonPath = path.join(
      workspaceFolderAbsPath,
      '02_targeted_cv_content.json',
    );
    expect(fs.existsSync(cvJsonPath)).toBe(true);

    const cvContent = JSON.parse(fs.readFileSync(cvJsonPath, 'utf-8'));
    expect(cvContent.overclaiming_check.critical_issues).toEqual([]);

    // 5. Approve CV draft
    const draftReviewRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/review-cv-draft`)
      .send({ action: 'approve' })
      .expect(201);

    expect(draftReviewRes.body.status).toBe('export_running');
    expect(draftReviewRes.body.canProceedToExport).toBe(true);

    // 6. Export PDF — must not create a new AiRun (ADR-012)
    const aiRunCountBeforeExport = await prisma.aiRun.count();

    const exportRes = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/export-cv`)
      .expect(201);

    expect(exportRes.body.status).toBe('cv_pdf_generated');

    const aiRunCountAfterExport = await prisma.aiRun.count();
    expect(aiRunCountAfterExport).toBe(aiRunCountBeforeExport);

    const htmlPath = path.join(workspaceFolderAbsPath, '04_cv_export.html');
    const pdfPath = path.join(workspaceFolderAbsPath, '04_cv_export.pdf');
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.statSync(htmlPath).size).toBeGreaterThan(0);
    expect(fs.statSync(pdfPath).size).toBeGreaterThan(0);

    // 7. Final DB assertions — full artifact set registered
    const finalWorkspace = await prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });
    expect(finalWorkspace?.status).toBe('cv_pdf_generated');

    const finalArtifacts = await prisma.generatedArtifact.findMany({
      where: { workspaceId },
    });
    const canonicalNames = finalArtifacts.map((a) => a.canonicalFileName);
    expect(canonicalNames).toEqual(
      expect.arrayContaining([
        '00_vacancy_source.txt',
        '01_vacancy_analysis.md',
        '01_vacancy_analysis.json',
        '02_targeted_cv_content.md',
        '02_targeted_cv_content.json',
        '04_cv_export.pdf',
      ]),
    );
  }, 60000);
});
