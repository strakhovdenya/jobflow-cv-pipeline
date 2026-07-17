import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AiRunsModule } from '../ai-runs/ai-runs.module';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { CoverLetterDraftsModule } from '../cover-letters/cover-letter-drafts.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { KnowledgeSourcesModule } from '../knowledge-sources/knowledge-sources.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptRunsModule } from '../prompt-runs/prompt-runs.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { WorkspaceStatusService } from '../workspaces/workspace-status.service';
import { CoverLetterInputBuilderService } from './cover-letter/cover-letter-input-builder.service';
import { CoverLetterService } from './cover-letter/cover-letter.service';
import { PromptInputBuilderService } from './prompt-input-builder.service';
import { Prompt1Service } from './prompt1/prompt1.service';
import { Prompt2InputBuilderService } from './prompt2/prompt2-input-builder.service';
import { Prompt2Service } from './prompt2/prompt2.service';
import { Prompt3InputBuilderService } from './prompt3/prompt3-input-builder.service';
import { Prompt3Service } from './prompt3/prompt3.service';
import { Prompt5InputBuilderService } from './prompt5/prompt5-input-builder.service';
import { Prompt5Service } from './prompt5/prompt5.service';
import { SkipReasonService } from './skip/skip-reason.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AiRunsModule,
    ArtifactStorageModule,
    ArtifactsModule,
    EvidenceModule,
    KnowledgeSourcesModule,
    PromptTemplatesModule,
    PromptRunsModule,
    CoverLetterDraftsModule,
  ],
  providers: [
    PromptInputBuilderService,
    Prompt1Service,
    Prompt2InputBuilderService,
    Prompt2Service,
    Prompt3InputBuilderService,
    Prompt3Service,
    Prompt5InputBuilderService,
    Prompt5Service,
    SkipReasonService,
    WorkspaceStatusService,
    CoverLetterInputBuilderService,
    CoverLetterService,
  ],
  exports: [
    Prompt1Service,
    Prompt2InputBuilderService,
    Prompt2Service,
    Prompt3InputBuilderService,
    Prompt3Service,
    Prompt5InputBuilderService,
    Prompt5Service,
    SkipReasonService,
    CoverLetterInputBuilderService,
    CoverLetterService,
  ],
})
export class PipelineModule {}
