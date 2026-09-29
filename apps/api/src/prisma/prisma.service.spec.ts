jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn(),
  };
});

import { PrismaClient } from '@prisma/client';
import {
  PrismaService,
  PRISMA_TRANSACTION_MAX_WAIT_MS,
  PRISMA_TRANSACTION_TIMEOUT_MS,
} from './prisma.service';

describe('PrismaService', () => {
  it('configures interactive transaction maxWait and timeout', () => {
    new PrismaService();

    expect(PrismaClient).toHaveBeenCalledWith({
      transactionOptions: {
        maxWait: PRISMA_TRANSACTION_MAX_WAIT_MS,
        timeout: PRISMA_TRANSACTION_TIMEOUT_MS,
      },
    });
  });

  it('keeps transaction timeout above maxWait', () => {
    expect(PRISMA_TRANSACTION_TIMEOUT_MS).toBeGreaterThan(
      PRISMA_TRANSACTION_MAX_WAIT_MS,
    );
  });
});
