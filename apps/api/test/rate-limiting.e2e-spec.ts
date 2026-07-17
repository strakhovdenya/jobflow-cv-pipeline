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
process.env.STORAGE_ROOT = testStorageRoot;
process.env.AI_PROVIDER = 'fake';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '5';
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
});
