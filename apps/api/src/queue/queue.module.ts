import { Module } from '@nestjs/common';
import { PipelineModule } from '../pipeline/pipeline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiStepsService } from './ai-steps.service';
import { QueueService } from './queue.service';
import { AiStepWorker } from './workers/ai-step.worker';

@Module({
  imports: [PipelineModule, PrismaModule],
  providers: [QueueService, AiStepsService, AiStepWorker],
  exports: [QueueService, AiStepsService],
})
export class QueueModule {}
