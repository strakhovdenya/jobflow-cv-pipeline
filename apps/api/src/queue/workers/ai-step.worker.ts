import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { CoverLetterService } from '../../pipeline/cover-letter/cover-letter.service';
import { Prompt1Service } from '../../pipeline/prompt1/prompt1.service';
import { Prompt2Service } from '../../pipeline/prompt2/prompt2.service';
import { Prompt3Service } from '../../pipeline/prompt3/prompt3.service';
import { Prompt5Service } from '../../pipeline/prompt5/prompt5.service';
import { SkipReasonService } from '../../pipeline/skip/skip-reason.service';
import { AiStepJobData, AiStepName } from '../ai-step.types';
import { QueueName } from '../queue.constants';

const WORKER_CONCURRENCY = 3;

type AiStepHandler = (data: AiStepJobData) => Promise<unknown>;

@Injectable()
export class AiStepWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiStepWorker.name);
  private worker: Worker | undefined;
  private readonly handlers: Record<AiStepName, AiStepHandler>;

  constructor(
    private readonly configService: ConfigService,
    prompt1Service: Prompt1Service,
    prompt2Service: Prompt2Service,
    prompt3Service: Prompt3Service,
    prompt5Service: Prompt5Service,
    skipReasonService: SkipReasonService,
    coverLetterService: CoverLetterService,
  ) {
    this.handlers = {
      prompt_1: ({ workspaceId }) => prompt1Service.runAnalysis(workspaceId),
      prompt_2: ({ workspaceId, notes }) =>
        prompt2Service.generateCvContent(workspaceId, notes),
      prompt_3: ({ workspaceId }) => prompt3Service.runPrePdfCheck(workspaceId),
      prompt_5: ({ workspaceId }) => prompt5Service.runFinalCheck(workspaceId),
      skip_reason: ({ workspaceId }) =>
        skipReasonService.confirmSkip(workspaceId),
      cover_letter: ({ workspaceId }) =>
        coverLetterService.generateCoverLetter(workspaceId),
    };
  }

  onModuleInit(): void {
    const connection = this.configService.get<string>('REDIS_URL');
    if (!connection) {
      this.logger.warn(
        `REDIS_URL not configured — ${QueueName.AI_STEP} worker not started`,
      );
      return;
    }

    // maxStalledCount: 0 — a job whose process died is failed, never silently re-run
    // (a re-run would repeat a paid AI call).
    this.worker = new Worker(
      QueueName.AI_STEP,
      (job: Job<AiStepJobData>) => this.process(job),
      {
        connection: { url: connection },
        prefix: this.configService.get<string>('QUEUE_PREFIX'),
        concurrency: WORKER_CONCURRENCY,
        maxStalledCount: 0,
      },
    );
    this.worker.on('error', (error) => {
      this.logger.error(`${QueueName.AI_STEP} worker error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<AiStepJobData>) {
    const handler = this.handlers[job.data.step];
    if (!handler) {
      throw new Error(`Unknown AI step "${job.data.step}"`);
    }
    return handler(job.data);
  }
}
