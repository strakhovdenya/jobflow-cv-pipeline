import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { WorkspaceStatus } from '@prisma/client';
import { Prompt1Service } from '../../pipeline/prompt1/prompt1.service';
import { AnalysisWorker } from './analysis.worker';

jest.mock('bullmq');

const MockedWorker = Worker as jest.MockedClass<typeof Worker>;

describe('AnalysisWorker', () => {
  let worker: AnalysisWorker;
  let configService: Partial<ConfigService>;
  let prompt1Service: Partial<Prompt1Service>;
  let mockClose: jest.Mock;

  beforeEach(() => {
    MockedWorker.mockClear();

    mockClose = jest.fn().mockResolvedValue(undefined);
    MockedWorker.mockImplementation(
      () =>
        ({
          close: mockClose,
        }) as unknown as Worker,
    );

    prompt1Service = {
      runAnalysis: jest.fn().mockResolvedValue({
        success: true,
        promptRunId: 'run-1',
        aiRunId: 'ai-1',
        workspaceStatus: WorkspaceStatus.paused_after_analysis,
      }),
    };
  });

  describe('when REDIS_URL is configured', () => {
    beforeEach(() => {
      configService = {
        get: jest.fn().mockReturnValue('redis://localhost:6379'),
      };
      worker = new AnalysisWorker(
        configService as ConfigService,
        prompt1Service as Prompt1Service,
      );
    });

    it('starts a BullMQ Worker on module init', () => {
      worker.onModuleInit();

      expect(MockedWorker).toHaveBeenCalledTimes(1);
      expect(MockedWorker.mock.calls[0][0]).toBe('analysis-queue');
    });

    it('processes a job by delegating to Prompt1Service.runAnalysis', async () => {
      worker.onModuleInit();
      const processor = MockedWorker.mock.calls[0][1] as (
        job: Job<{ workspaceId: string }>,
      ) => Promise<unknown>;

      const job = { data: { workspaceId: 'ws-1' } } as Job<{
        workspaceId: string;
      }>;
      const result = await processor(job);

      expect(prompt1Service.runAnalysis).toHaveBeenCalledWith('ws-1');
      expect(result).toEqual({
        success: true,
        promptRunId: 'run-1',
        aiRunId: 'ai-1',
        workspaceStatus: WorkspaceStatus.paused_after_analysis,
      });
    });

    it('closes the worker on module destroy', async () => {
      worker.onModuleInit();
      await worker.onModuleDestroy();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('when REDIS_URL is not configured', () => {
    beforeEach(() => {
      configService = { get: jest.fn().mockReturnValue(undefined) };
      worker = new AnalysisWorker(
        configService as ConfigService,
        prompt1Service as Prompt1Service,
      );
    });

    it('does not start a BullMQ Worker', () => {
      worker.onModuleInit();

      expect(MockedWorker).not.toHaveBeenCalled();
    });

    it('does not throw on module destroy', async () => {
      worker.onModuleInit();

      await expect(worker.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
