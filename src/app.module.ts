import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { AiRunsModule } from './ai-runs/ai-runs.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvidenceModule } from './evidence/evidence.module';
import { KnowledgeSourcesModule } from './knowledge-sources/knowledge-sources.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromptRunsModule } from './prompt-runs/prompt-runs.module';
import { PromptTemplatesModule } from './prompt-templates/prompt-templates.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    PrismaModule,
    WorkspacesModule,
    ArtifactsModule,
    KnowledgeSourcesModule,
    EvidenceModule,
    PromptTemplatesModule,
    AiRunsModule,
    AiModule,
    PromptRunsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
