import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';

@Controller('test')
class TestController {
  @Get()
  ping() {
    return 'ok';
  }
}

describe('ThrottlerGuard — 429 on limit exceeded', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 10_000, limit: 2 }])],
      controllers: [TestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('allows requests within the limit', async () => {
    await request(app.getHttpServer()).get('/test').expect(200);
    await request(app.getHttpServer()).get('/test').expect(200);
  });

  it('returns 429 when limit is exceeded', async () => {
    await request(app.getHttpServer()).get('/test').expect(429);
  });
});
