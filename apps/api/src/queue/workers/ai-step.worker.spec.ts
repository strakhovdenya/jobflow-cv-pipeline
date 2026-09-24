import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { CoverLetterService } from '../../pipeline/cover-letter/cover-letter.service';
import { Prompt1Service } from '../../pipeline/prompt1/prompt1.service';
import { Prompt2Service } from '../../pipeline/prompt2/prompt2.service';
import { Prompt3Service } from '../../pipeline/prompt3/prompt3.service';
import { Prompt5Service } from '../../pipeline/prompt5/prompt5.service';
import { SkipReasonService } from '../../pipeline/skip/skip-reason.service';
import { AiStepJobData } from '../ai-step.types';
import { AiStepWorker } from './ai-step.worker';

jest.mock('bullmq');

const MockedWorker = Worker as jest.MockedClass<typeof Worker>;

type Processor = (job: Job<AiStepJobData>) => Promise<unknown>;

describe('AiStepWorker', () => {
  let configService: Partial<ConfigService>;
  let prompt1Service: { runAnalysis: jest.Mock };
  let prompt2Service: { generateCvContent: jest.Mock };
  let prompt3Service: { runPrePdfCheck: jest.Mock };
  let prompt5Service: { runFinalCheck: jest.Mock };
  let skipReasonService: { confirmSkip: jest.Mock };
  let coverLetterService: { generateCoverLetter: jest.Mock };
  let mockClose: jest.Mock;
  let mockOn: jest.Mock;

  const createWorker = () =>
    new AiStepWorker(
      configService as ConfigService,
      prompt1Service as unknown as Prompt1Service,
      prompt2Service as unknown as Prompt2Service,
      prompt3Service as unknown as Prompt3Service,
      prompt5Service as unknown as Prompt5Service,
      skipReasonService as unknown as SkipReasonService,
      coverLetterService as unknown as CoverLetterService,
    );

  const startAndGetProcessor = (): Processor => {
    createWorker().onModuleInit();
    return MockedWorker.mock.calls[0][1] as Processor;
  };

  const jobOf = (data: AiStepJobData) => ({ data }) as Job<AiStepJobData>;

  beforeEach(() => {
    MockedWorker.mockClear();
    mockClose = jest.fn().mockResolvedValue(undefined);
    mockOn = jest.fn();
    MockedWorker.mockImplementation(
      () => ({ close: mockClose, on: mockOn }) as unknown as Worker,
    );

    configService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };
    prompt1Service = { runAnalysis: jest.fn().mockResolvedValue('p1') };
    prompt2Service = { generateCvContent: jest.fn().mockResolvedValue('p2') };
    prompt3Service = { runPrePdfCheck: jest.fn().mockResolvedValue('p3') };
    prompt5Service = { runFinalCheck: jest.fn().mockResolvedValue('p5') };
    skipReasonService = { confirmSkip: jest.fn().mockResolvedValue('skip') };
    coverLetterService = {
      generateCoverLetter: jest.fn().mockResolvedValue('cover'),
    };
  });

  describe('when REDIS_URL is configured', () => {
    it('starts a BullMQ Worker on the ai-step queue without stalled re-runs', () => {
      createWorker().onModuleInit();

      expect(MockedWorker).toHaveBeenCalledTimes(1);
      expect(MockedWorker.mock.calls[0][0]).toBe('ai-step-queue');
      expect(MockedWorker.mock.calls[0][2]).toMatchObject({
        maxStalledCount: 0,
      });
    });

    it('routes prompt_1 to Prompt1Service.runAnalysis', async () => {
      const process = startAndGetProcessor();

      const result = await process(
        jobOf({ step: 'prompt_1', workspaceId: 'ws-1' }),
      );

      expect(prompt1Service.runAnalysis).toHaveBeenCalledWith('ws-1');
      expect(result).toBe('p1');
    });

    it('routes prompt_2 to Prompt2Service.generateCvContent with the notes', async () => {
      const process = startAndGetProcessor();

      await process(
        jobOf({ step: 'prompt_2', workspaceId: 'ws-1', notes: 'more AWS' }),
      );

      expect(prompt2Service.generateCvContent).toHaveBeenCalledWith(
        'ws-1',
        'more AWS',
      );
    });

    it('routes prompt_3, prompt_5, skip_reason and cover_letter to their services', async () => {
      const process = startAndGetProcessor();

      await process(jobOf({ step: 'prompt_3', workspaceId: 'ws-1' }));
      await process(jobOf({ step: 'prompt_5', workspaceId: 'ws-1' }));
      await process(jobOf({ step: 'skip_reason', workspaceId: 'ws-1' }));
      await process(jobOf({ step: 'cover_letter', workspaceId: 'ws-1' }));

      expect(prompt3Service.runPrePdfCheck).toHaveBeenCalledWith('ws-1');
      expect(prompt5Service.runFinalCheck).toHaveBeenCalledWith('ws-1');
      expect(skipReasonService.confirmSkip).toHaveBeenCalledWith('ws-1');
      expect(coverLetterService.generateCoverLetter).toHaveBeenCalledWith(
        'ws-1',
      );
    });

    it('lets a step failure propagate so BullMQ marks the job failed', async () => {
      prompt2Service.generateCvContent.mockRejectedValue(new Error('boom'));
      const process = startAndGetProcessor();

      await expect(
        process(jobOf({ step: 'prompt_2', workspaceId: 'ws-1' })),
      ).rejects.toThrow('boom');
    });

    it('rejects an unknown step', async () => {
      const process = startAndGetProcessor();

      await expect(
        process(jobOf({ step: 'nope' as never, workspaceId: 'ws-1' })),
      ).rejects.toThrow('Unknown AI step "nope"');
    });

    it('closes the worker on module destroy', async () => {
      const worker = createWorker();
      worker.onModuleInit();

      await worker.onModuleDestroy();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('when REDIS_URL is not configured', () => {
    beforeEach(() => {
      configService = { get: jest.fn().mockReturnValue(undefined) };
    });

    it('does not start a BullMQ Worker', () => {
      createWorker().onModuleInit();

      expect(MockedWorker).not.toHaveBeenCalled();
    });

    it('does not throw on module destroy', async () => {
      const worker = createWorker();
      worker.onModuleInit();

      await expect(worker.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
