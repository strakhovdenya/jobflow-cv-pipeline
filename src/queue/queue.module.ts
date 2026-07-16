import { Module } from '@nestjs/common';
import { PipelineModule } from '../pipeline/pipeline.module';
import { QueueService } from './queue.service';
import { AnalysisWorker } from './workers/analysis.worker';

@Module({
  imports: [PipelineModule],
  providers: [QueueService, AnalysisWorker],
  exports: [QueueService],
})
export class QueueModule {}
