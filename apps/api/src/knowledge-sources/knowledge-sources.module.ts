import { Module } from '@nestjs/common';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeSourceContentService } from './knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from './knowledge-source-selection.service';
import { KnowledgeSourcesService } from './knowledge-sources.service';

@Module({
  imports: [PrismaModule, ArtifactsModule],
  providers: [
    KnowledgeSourcesService,
    KnowledgeSourceSelectionService,
    KnowledgeSourceContentService,
  ],
  exports: [
    KnowledgeSourcesService,
    KnowledgeSourceSelectionService,
    KnowledgeSourceContentService,
  ],
})
export class KnowledgeSourcesModule {}
