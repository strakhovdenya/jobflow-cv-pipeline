import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be set before AppModule (and its ConfigModule/dotenv load) is imported — same isolation
// pattern as skip-flow.e2e-spec.ts.
const testStorageRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-artifact-e2e-'),
);
process.env.STORAGE_ROOT = testStorageRoot;
process.env.AI_PROVIDER = 'fake';
process.env.API_KEY = 'test-api-key';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import {
  ArtifactsService,
  RegisterArtifactDto,
} from '../src/artifacts/artifacts.service';
import { PrismaService } from '../src/prisma/prisma.service';

const PARALLEL_REGISTRATIONS = 8;

describe('ArtifactsService.register under concurrency (e2e, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let artifacts: ArtifactsService;
  let workspaceId: string;
  let companyId: string;
  let jobVacancyId: string;

  const dtoFor = (index: number): RegisterArtifactDto => ({
    workspaceId,
    artifactType: 'cv_export_pdf',
    canonicalFileName: '04_cv_export.pdf',
    filePath: `/tmp/parallel-${index}.pdf`,
    storageRoot: testStorageRoot,
    contentHash: `hash-${index}`,
    origin: 'generated_by_export_service',
  });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
    artifacts = app.get(ArtifactsService);

    const createRes = await request(app.getHttpServer())
      .post('/workspaces')
      .set('X-API-Key', 'test-api-key')
      .send({
        companyNameOriginal: 'Artifact Concurrency Company',
        roleTitleOriginal: 'Backend Developer',
        vacancyText: 'Concurrency fixture vacancy text for artifact e2e.',
      })
      .expect(201);
    workspaceId = createRes.body.id;
    companyId = createRes.body.companyId;
    jobVacancyId = createRes.body.jobVacancyId;
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.generatedArtifact.deleteMany({ where: { workspaceId } });
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

  it('keeps exactly one isLatest row and gapless versions when registrations race', async () => {
    const registered = await Promise.all(
      Array.from({ length: PARALLEL_REGISTRATIONS }, (_, index) =>
        artifacts.register(dtoFor(index)),
      ),
    );

    const rows = await prisma.generatedArtifact.findMany({
      where: { workspaceId, artifactType: 'cv_export_pdf' },
      orderBy: { version: 'asc' },
    });

    expect(registered).toHaveLength(PARALLEL_REGISTRATIONS);
    expect(rows.map((row) => row.version)).toEqual(
      Array.from({ length: PARALLEL_REGISTRATIONS }, (_, i) => i + 1),
    );
    expect(rows.filter((row) => row.isLatest)).toHaveLength(1);
    expect(rows[rows.length - 1].isLatest).toBe(true);
  });

  it('rejects a second isLatest row for the same workspace + type at the DB level', async () => {
    await expect(
      prisma.generatedArtifact.create({
        data: {
          workspaceId,
          artifactType: 'cv_export_pdf',
          canonicalFileName: '04_cv_export.pdf',
          filePath: '/tmp/dup-latest.pdf',
          storageRoot: testStorageRoot,
          contentHash: 'dup',
          isLatest: true,
          version: 999,
          origin: 'generated_by_export_service',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects a duplicate version for the same workspace + type at the DB level', async () => {
    const attempt = prisma.generatedArtifact.create({
      data: {
        workspaceId,
        artifactType: 'cv_export_pdf',
        canonicalFileName: '04_cv_export.pdf',
        filePath: '/tmp/dup-version.pdf',
        storageRoot: testStorageRoot,
        contentHash: 'dup',
        isLatest: false,
        version: 1,
        origin: 'generated_by_export_service',
      },
    });

    await expect(attempt).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });
});
