import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiStepJobData } from './ai-step.types';
import { AiStepsService } from './ai-steps.service';
import { QueueName } from './queue.constants';
import { JobStatusResult, QueueService } from './queue.service';

const jobStatus = (
  jobId: string,
  data: AiStepJobData,
  state = 'active',
): JobStatusResult<AiStepJobData> => ({ jobId, state, data });

describe('AiStepsService', () => {
  let service: AiStepsService;
  let queueService: {
    enqueue: jest.Mock;
    getStatus: jest.Mock;
    cancel: jest.Mock;
  };
  let prisma: { applicationWorkspace: { count: jest.Mock } };

  beforeEach(() => {
    queueService = {
      enqueue: jest.fn().mockResolvedValue({ jobId: 'prompt_2-ws-1' }),
      getStatus: jest.fn().mockResolvedValue(null),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      applicationWorkspace: { count: jest.fn().mockResolvedValue(1) },
    };
    service = new AiStepsService(
      queueService as unknown as QueueService,
      prisma as unknown as PrismaService,
    );
  });

  describe('enqueue', () => {
    it('adds the step under a deterministic job id and returns it', async () => {
      const result = await service.enqueue('prompt_2', 'ws-1', 'more AWS');

      expect(queueService.enqueue).toHaveBeenCalledWith(
        QueueName.AI_STEP,
        'prompt_2',
        { step: 'prompt_2', workspaceId: 'ws-1', notes: 'more AWS' },
        { jobId: 'prompt_2-ws-1' },
      );
      expect(result).toEqual({ jobId: 'prompt_2-ws-1' });
    });

    it('rejects with 404 for an unknown workspace without queueing anything', async () => {
      prisma.applicationWorkspace.count.mockResolvedValue(0);

      await expect(service.enqueue('prompt_2', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(queueService.enqueue).not.toHaveBeenCalled();
    });

    it.each(['waiting', 'active', 'delayed', 'prioritized'])(
      'rejects with 409 while the same step is %s',
      async (state) => {
        queueService.getStatus.mockResolvedValue(
          jobStatus(
            'prompt_2-ws-1',
            { step: 'prompt_2', workspaceId: 'ws-1' },
            state,
          ),
        );

        await expect(service.enqueue('prompt_2', 'ws-1')).rejects.toThrow(
          ConflictException,
        );
        expect(queueService.enqueue).not.toHaveBeenCalled();
        expect(queueService.cancel).not.toHaveBeenCalled();
      },
    );

    it.each(['completed', 'failed'])(
      'drops the %s previous job so the same step can run again',
      async (state) => {
        queueService.getStatus.mockResolvedValue(
          jobStatus(
            'prompt_2-ws-1',
            { step: 'prompt_2', workspaceId: 'ws-1' },
            state,
          ),
        );

        await service.enqueue('prompt_2', 'ws-1');

        expect(queueService.cancel).toHaveBeenCalledWith(
          QueueName.AI_STEP,
          'prompt_2-ws-1',
        );
        expect(queueService.enqueue).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('getJob', () => {
    it('returns the status of a job that belongs to the workspace', async () => {
      const status = jobStatus(
        'prompt_1-ws-1',
        { step: 'prompt_1', workspaceId: 'ws-1' },
        'completed',
      );
      queueService.getStatus.mockResolvedValue(status);

      await expect(service.getJob('ws-1', 'prompt_1-ws-1')).resolves.toBe(
        status,
      );
    });

    it('throws NotFoundException for an unknown job', async () => {
      await expect(service.getJob('ws-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for a job of another workspace', async () => {
      queueService.getStatus.mockResolvedValue(
        jobStatus('prompt_1-ws-2', { step: 'prompt_1', workspaceId: 'ws-2' }),
      );

      await expect(service.getJob('ws-1', 'prompt_1-ws-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActiveJob', () => {
    it('looks up one job id per step of the workspace and returns the open one', async () => {
      queueService.getStatus.mockImplementation(
        (_queue: string, jobId: string) =>
          Promise.resolve(
            jobId === 'prompt_2-ws-1'
              ? jobStatus(
                  jobId,
                  { step: 'prompt_2', workspaceId: 'ws-1' },
                  'waiting',
                )
              : null,
          ),
      );

      await expect(service.findActiveJob('ws-1')).resolves.toEqual({
        jobId: 'prompt_2-ws-1',
        step: 'prompt_2',
        state: 'waiting',
      });
      expect(queueService.getStatus).toHaveBeenCalledTimes(6);
    });

    it('ignores finished jobs', async () => {
      queueService.getStatus.mockResolvedValue(
        jobStatus(
          'prompt_2-ws-1',
          { step: 'prompt_2', workspaceId: 'ws-1' },
          'completed',
        ),
      );

      await expect(service.findActiveJob('ws-1')).resolves.toBeNull();
    });

    it('returns null when the workspace has no job', async () => {
      await expect(service.findActiveJob('ws-1')).resolves.toBeNull();
    });
  });
});
