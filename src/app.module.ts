import { Module } from '@nestjs/common';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvidenceModule } from './evidence/evidence.module';
import { KnowledgeSourcesModule } from './knowledge-sources/knowledge-sources.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    PrismaModule,
    WorkspacesModule,
    ArtifactsModule,
    KnowledgeSourcesModule,
    EvidenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
