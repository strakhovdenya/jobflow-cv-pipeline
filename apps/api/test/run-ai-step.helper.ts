import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

const POLL_INTERVAL_MS = 100;
const TIMEOUT_MS = 30_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// AI step endpoints answer 202 + jobId and run in the BullMQ worker; this posts the step and
// polls the job until it finishes, returning what the step service returned.
export const runAiStep = async <T = Record<string, unknown>>(
  app: INestApplication,
  apiKey: string,
  workspaceId: string,
  route: string,
): Promise<T> => {
  const enqueueRes = await request(app.getHttpServer())
    .post(`/workspaces/${workspaceId}/${route}`)
    .set('X-API-Key', apiKey)
    .expect(202);

  const jobId = enqueueRes.body.jobId as string;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const jobRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/jobs/${jobId}`)
      .set('X-API-Key', apiKey)
      .expect(200);

    if (jobRes.body.state === 'completed') {
      return jobRes.body.returnValue as T;
    }
    if (jobRes.body.state === 'failed') {
      throw new Error(`Job ${jobId} failed: ${jobRes.body.failedReason}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Job ${jobId} did not finish within ${TIMEOUT_MS} ms`);
};
