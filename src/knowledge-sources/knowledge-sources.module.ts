import { Module } from '@nestjs/common';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeSourcesService } from './knowledge-sources.service';

@Module({
  imports: [PrismaModule, ArtifactsModule],
  providers: [KnowledgeSourcesService],
  exports: [KnowledgeSourcesService],
})
export class KnowledgeSourcesModule {}
