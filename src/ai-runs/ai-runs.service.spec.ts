import { Test, TestingModule } from '@nestjs/testing';
import { AiRunsService } from './ai-runs.service';
import { PrismaService } from '../prisma/prisma.service';

const makePrismaMock = () => ({
  aiRun: {
    create: jest.fn(),
  },
});

describe('AiRunsService', () => {
  let service: AiRunsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiRunsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AiRunsService>(AiRunsService);
  });

  describe('saveSuccess', () => {
    it('creates an AiRun record with status completed', async () => {
      const expected = {
        id: 'ai-run-1',
        provider: 'fake',
        model: 'fake-model-v1',
        status: 'completed',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        errorMessage: null,
      };
      prisma.aiRun.create.mockResolvedValue(expected);

      const result = await service.saveSuccess({
        provider: 'fake',
        model: 'fake-model-v1',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });

      expect(prisma.aiRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
      expect(result.status).toBe('completed');
      expect(result.inputTokens).toBe(100);
    });

    it('stores token usage fields when provided', async () => {
      prisma.aiRun.create.mockResolvedValue({ status: 'completed' });

      await service.saveSuccess({
        provider: 'fake',
        model: 'fake-model-v1',
        inputTokens: 200,
        outputTokens: 80,
        totalTokens: 280,
        cachedInputTokens: 50,
        costEstimate: 0.005,
        costCurrency: 'USD',
      });

      expect(prisma.aiRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputTokens: 200,
            outputTokens: 80,
            totalTokens: 280,
            cachedInputTokens: 50,
            costEstimate: 0.005,
            costCurrency: 'USD',
          }),
        }),
      );
    });
  });

  describe('saveFailed', () => {
    it('creates an AiRun record with status failed and error message', async () => {
      const expected = {
        id: 'ai-run-fail-1',
        provider: 'fake',
        model: 'fake-model-v1',
        status: 'failed',
        errorMessage: 'Provider timeout',
      };
      prisma.aiRun.create.mockResolvedValue(expected);

      const result = await service.saveFailed({
        provider: 'fake',
        model: 'fake-model-v1',
        errorMessage: 'Provider timeout',
      });

      expect(prisma.aiRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            errorMessage: 'Provider timeout',
          }),
        }),
      );
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Provider timeout');
    });
  });
});
