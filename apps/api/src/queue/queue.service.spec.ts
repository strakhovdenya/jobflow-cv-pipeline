import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueName } from './queue.constants';
import { QueueService } from './queue.service';

jest.mock('bullmq');

const MockedQueue = Queue as jest.MockedClass<typeof Queue>;

describe('QueueService', () => {
  let service: QueueService;
  let configService: Partial<ConfigService>;
  let mockAdd: jest.Mock;
  let mockGetJob: jest.Mock;

  beforeEach(() => {
    MockedQueue.mockClear();

    mockAdd = jest.fn();
    mockGetJob = jest.fn();

    MockedQueue.mockImplementation(
      () =>
        ({
          add: mockAdd,
          getJob: mockGetJob,
        }) as unknown as Queue,
    );

    configService = {
      getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379'),
    };

    service = new QueueService(configService as ConfigService);
  });

  describe('enqueue', () => {
    it('adds a job to the queue and returns its id', async () => {
      mockAdd.mockResolvedValue({ id: 'job-1' });

      const result = await service.enqueue(QueueName.ANALYSIS, 'run-analysis', {
        workspaceId: 'ws-1',
      });

      expect(result).toEqual({ jobId: 'job-1' });
      expect(mockAdd).toHaveBeenCalledWith('run-analysis', {
        workspaceId: 'ws-1',
      });
    });

    it('creates only one Queue instance per queue name across calls', async () => {
      mockAdd.mockResolvedValue({ id: 'job-1' });

      await service.enqueue(QueueName.ANALYSIS, 'run-analysis', {});
      await service.enqueue(QueueName.ANALYSIS, 'run-analysis', {});

      expect(MockedQueue).toHaveBeenCalledTimes(1);
    });

    it('creates separate Queue instances for different queue names', async () => {
      mockAdd.mockResolvedValue({ id: 'job-1' });

      await service.enqueue(QueueName.ANALYSIS, 'run-analysis', {});
      await service.enqueue(QueueName.CV_GENERATION, 'generate-cv', {});

      expect(MockedQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatus', () => {
    it('returns null when the job does not exist', async () => {
      mockGetJob.mockResolvedValue(undefined);

      const result = await service.getStatus(QueueName.ANALYSIS, 'missing');

      expect(result).toBeNull();
    });

    it('returns job state, return value and failure reason', async () => {
      mockGetJob.mockResolvedValue({
        id: 'job-1',
        getState: jest.fn().mockResolvedValue('completed'),
        returnvalue: { ok: true },
        failedReason: undefined,
      });

      const result = await service.getStatus(QueueName.ANALYSIS, 'job-1');

      expect(result).toEqual({
        jobId: 'job-1',
        state: 'completed',
        returnValue: { ok: true },
        failedReason: undefined,
      });
    });
  });

  describe('retry', () => {
    it('calls retry() on the job', async () => {
      const mockRetry = jest.fn().mockResolvedValue(undefined);
      mockGetJob.mockResolvedValue({ id: 'job-1', retry: mockRetry });

      await service.retry(QueueName.FINAL_CHECK, 'job-1');

      expect(mockRetry).toHaveBeenCalled();
    });

    it('throws NotFoundException when the job does not exist', async () => {
      mockGetJob.mockResolvedValue(undefined);

      await expect(
        service.retry(QueueName.FINAL_CHECK, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('calls remove() on the job', async () => {
      const mockRemove = jest.fn().mockResolvedValue(undefined);
      mockGetJob.mockResolvedValue({ id: 'job-1', remove: mockRemove });

      await service.cancel(QueueName.DOCUMENT_EXPORT, 'job-1');

      expect(mockRemove).toHaveBeenCalled();
    });

    it('throws NotFoundException when the job does not exist', async () => {
      mockGetJob.mockResolvedValue(undefined);

      await expect(
        service.cancel(QueueName.DOCUMENT_EXPORT, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
