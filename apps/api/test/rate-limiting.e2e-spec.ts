import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be set before AppModule (and its ConfigModule/dotenv load) is imported,
// so the throttler picks up a small, fast-to-exceed limit instead of the
// production defaults (100 req / 60s), and the app never touches the real
// storage/applications folder.
const testStorageRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-throttle-e2e-'),
);
const testKnowledgeSourcesRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'jobflow-throttle-e2e-knowledge-'),
);
process.env.STORAGE_ROOT = testStorageRoot;
process.env.KNOWLEDGE_SOURCES_ROOT = testKnowledgeSourcesRoot;
process.env.AI_PROVIDER = 'fake';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '5';
process.env.THROTTLE_AI_STEP_LIMIT = '3';
process.env.API_KEY = 'test-api-key';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// tsconfig has no esModuleInterop, and supertest's `export =` typing needs
// this form to keep the default export callable (`request(app.getHttpServer())`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Lets each test count against its own client IP via X-Forwarded-For.
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 once THROTTLE_LIMIT is exceeded within THROTTLE_TTL', async () => {
    const limit = Number(process.env.THROTTLE_LIMIT);
    const server = app.getHttpServer();

    for (let i = 0; i < limit; i++) {
      const res = await request(server)
        .get('/version')
        .set('X-API-Key', 'test-api-key');
      expect(res.status).not.toBe(429);
    }

    const res = await request(server)
      .get('/version')
      .set('X-API-Key', 'test-api-key');
    expect(res.status).toBe(429);
  });

  it('does not throttle /health, even past the request limit', async () => {
    const limit = Number(process.env.THROTTLE_LIMIT);
    const server = app.getHttpServer();

    for (let i = 0; i < limit + 3; i++) {
      const res = await request(server).get('/health');
      expect(res.status).toBe(200);
    }
  });

  const getAs = (clientIp: string, url: string) =>
    request(app.getHttpServer())
      .get(url)
      .set('X-API-Key', 'test-api-key')
      .set('X-Forwarded-For', clientIp);

  const enqueueAs = (clientIp: string) =>
    request(app.getHttpServer())
      .post('/workspaces/throttle-test/run-analysis')
      .set('X-API-Key', 'test-api-key')
      .set('X-Forwarded-For', clientIp);

  it('does not throttle job polling past the general limit', async () => {
    const limit = Number(process.env.THROTTLE_LIMIT);

    for (let i = 0; i < limit + 10; i++) {
      const res = await getAs('10.0.0.1', '/workspaces/throttle-test/jobs/job');
      expect(res.status).not.toBe(429);
    }
  });

  it('throttles AI step enqueue past the AI step limit', async () => {
    const limit = Number(process.env.THROTTLE_AI_STEP_LIMIT);

    for (let i = 0; i < limit; i++) {
      const res = await enqueueAs('10.0.0.2');
      expect(res.status).not.toBe(429);
    }

    const res = await enqueueAs('10.0.0.2');
    expect(res.status).toBe(429);
  });

  it('does not count AI step enqueue against the general limit', async () => {
    const limit = Number(process.env.THROTTLE_AI_STEP_LIMIT);

    for (let i = 0; i < limit; i++) {
      await enqueueAs('10.0.0.3');
    }

    const res = await getAs('10.0.0.3', '/version');
    expect(res.status).not.toBe(429);
  });

  it('shares the AI step limit across all AI step enqueue routes', async () => {
    const limit = Number(process.env.THROTTLE_AI_STEP_LIMIT);

    for (let i = 0; i < limit; i++) {
      await enqueueAs('10.0.0.4');
    }

    const res = await request(app.getHttpServer())
      .post('/workspaces/throttle-test/generate-cv-content')
      .set('X-API-Key', 'test-api-key')
      .set('X-Forwarded-For', '10.0.0.4');
    expect(res.status).toBe(429);
  });
});
