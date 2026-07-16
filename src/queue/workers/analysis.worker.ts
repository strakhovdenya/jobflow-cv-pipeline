import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { Prompt1Service } from '../../pipeline/prompt1/prompt1.service';
import { QueueName } from '../queue.constants';

export interface AnalysisJobData {
  workspaceId: string;
}

@Injectable()
export class AnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalysisWorker.name);
  private worker: Worker | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly prompt1Service: Prompt1Service,
  ) {}

  onModuleInit(): void {
    const connection = this.configService.get<string>('REDIS_URL');
    if (!connection) {
      this.logger.warn(
        `REDIS_URL not configured — ${QueueName.ANALYSIS} worker not started`,
      );
      return;
    }

    this.worker = new Worker(
      QueueName.ANALYSIS,
      (job: Job<AnalysisJobData>) => this.process(job),
      { connection: { url: connection } },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<AnalysisJobData>) {
    return this.prompt1Service.runAnalysis(job.data.workspaceId);
  }
}
