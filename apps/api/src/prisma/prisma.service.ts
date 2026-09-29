import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Interactive transactions (ArtifactsService.register, import confirm) default to Prisma's own
// maxWait 2000ms / timeout 5000ms — well below the connection pool's own pool_timeout (10s), so a
// brief burst of pool contention throws P2028 ("Unable to start a transaction in the given time")
// before an ordinary query would even time out (ISSUE-543). Matching maxWait to the pool timeout,
// and giving timeout headroom above it, means an interactive transaction waits and runs at least
// as long as an ordinary query before failing.
export const PRISMA_TRANSACTION_MAX_WAIT_MS = 10_000;
export const PRISMA_TRANSACTION_TIMEOUT_MS = 15_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      transactionOptions: {
        maxWait: PRISMA_TRANSACTION_MAX_WAIT_MS,
        timeout: PRISMA_TRANSACTION_TIMEOUT_MS,
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
