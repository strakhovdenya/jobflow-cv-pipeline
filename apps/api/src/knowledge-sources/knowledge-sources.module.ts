import { Module } from '@nestjs/common';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeSourceSelectionService } from './knowledge-source-selection.service';
import { KnowledgeSourcesService } from './knowledge-sources.service';

@Module({
  imports: [PrismaModule, ArtifactsModule],
  providers: [KnowledgeSourcesService, KnowledgeSourceSelectionService],
  exports: [KnowledgeSourcesService, KnowledgeSourceSelectionService],
})
export class KnowledgeSourcesModule {}
