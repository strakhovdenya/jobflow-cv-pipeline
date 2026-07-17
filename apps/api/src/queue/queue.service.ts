import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueName } from './queue.constants';

export interface JobStatusResult {
  jobId: string;
  state: string;
  returnValue?: unknown;
  failedReason?: string;
}

@Injectable()
export class QueueService {
  private readonly queues = new Map<QueueName, Queue>();

  constructor(private readonly configService: ConfigService) {}

  async enqueue<T = unknown>(
    queueName: QueueName,
    jobName: string,
    data: T,
  ): Promise<{ jobId: string }> {
    const job = await this.getQueue(queueName).add(jobName, data);
    return { jobId: job.id as string };
  }

  async getStatus(
    queueName: QueueName,
    jobId: string,
  ): Promise<JobStatusResult | null> {
    const job = await this.getQueue(queueName).getJob(jobId);
    if (!job) {
      return null;
    }
    const state = await job.getState();
    return {
      jobId: job.id as string,
      state,
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
      const connection = this.configService.getOrThrow<string>('REDIS_URL');
      queue = new Queue(queueName, { connection: { url: connection } });
      this.queues.set(queueName, queue);
    }
    return queue;
  }
}
