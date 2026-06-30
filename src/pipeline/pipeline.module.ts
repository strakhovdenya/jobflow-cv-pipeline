import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AiRunsModule } from '../ai-runs/ai-runs.module';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { KnowledgeSourcesModule } from '../knowledge-sources/knowledge-sources.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptRunsModule } from '../prompt-runs/prompt-runs.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { PromptInputBuilderService } from './prompt-input-builder.service';
import { Prompt1Service } from './prompt1/prompt1.service';
import { SkipReasonService } from './skip/skip-reason.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AiRunsModule,
    ArtifactStorageModule,
    ArtifactsModule,
    KnowledgeSourcesModule,
    PromptTemplatesModule,
    PromptRunsModule,
  ],
  providers: [PromptInputBuilderService, Prompt1Service, SkipReasonService],
  exports: [Prompt1Service, SkipReasonService],
})
export class PipelineModule {}
