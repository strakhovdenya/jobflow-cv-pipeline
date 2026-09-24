import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue } from 'bullmq';
import { QueueName } from './queue.constants';

export interface JobStatusResult<T = unknown> {
  jobId: string;
  state: string;
  data: T;
  returnValue?: unknown;
  failedReason?: string;
}

const COMPLETED_JOB_TTL_SECONDS = 60 * 60;
const FAILED_JOB_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class QueueService {
  private readonly queues = new Map<QueueName, Queue>();

  constructor(private readonly configService: ConfigService) {}

  async enqueue<T = unknown>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options?: JobsOptions,
  ): Promise<{ jobId: string }> {
    const job = await this.getQueue(queueName).add(jobName, data, options);
    return { jobId: job.id as string };
  }

  async getStatus<T = unknown>(
    queueName: QueueName,
    jobId: string,
  ): Promise<JobStatusResult<T> | null> {
    const job = await this.getQueue(queueName).getJob(jobId);
    if (!job) {
      return null;
    }
    const state = await job.getState();
    return {
      jobId: job.id as string,
      state,
      data: job.data as T,
      returnValue: job.returnvalue as unknown,
      failedReason: job.failedReason,
    };
  }

  async retry(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.findJobOrThrow(queueName, jobId);
    await job.retry();
  }

  async cancel(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.findJobOrThrow(queueName, jobId);
    await job.remove();
  }

  private async findJobOrThrow(queueName: QueueName, jobId: string) {
    const job = await this.getQueue(queueName).getJob(jobId);
    if (!job) {
      throw new NotFoundException(
        `Job ${jobId} not found in queue ${queueName}`,
      );
    }
    return job;
  }

  private getQueue(queueName: QueueName): Queue {
    let queue = this.queues.get(queueName);
    if (!queue) {
      const connection = this.configService.get<string>('REDIS_URL');
      if (!connection) {
        throw new ServiceUnavailableException(
          'Background queue is not configured (REDIS_URL is not set)',
        );
      }
      // attempts: 1 — a retry would repeat a paid AI call; a failed step is re-run by the user.
      queue = new Queue(queueName, {
        connection: { url: connection },
        prefix: this.configService.get<string>('QUEUE_PREFIX'),
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: { age: COMPLETED_JOB_TTL_SECONDS },
          removeOnFail: { age: FAILED_JOB_TTL_SECONDS },
        },
      });
      this.queues.set(queueName, queue);
    }
    return queue;
  }
}
