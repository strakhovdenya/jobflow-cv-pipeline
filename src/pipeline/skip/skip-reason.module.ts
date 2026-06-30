import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { AiRunsModule } from '../../ai-runs/ai-runs.module';
import { ArtifactStorageModule } from '../../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../../artifacts/artifacts.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PromptRunsModule } from '../../prompt-runs/prompt-runs.module';
import { PromptTemplatesModule } from '../../prompt-templates/prompt-templates.module';
import { SkipReasonService } from './skip-reason.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AiRunsModule,
    ArtifactStorageModule,
    ArtifactsModule,
    PromptTemplatesModule,
    PromptRunsModule,
  ],
  providers: [SkipReasonService],
  exports: [SkipReasonService],
})
export class SkipReasonModule {}
