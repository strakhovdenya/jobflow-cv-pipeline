import { Module } from '@nestjs/common';
import { ApplicationTrackingModule } from '../application-tracking/application-tracking.module';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { SlugModule } from '../common/slug/slug.module';
import { CompanyModule } from '../company/company.module';
import { KnowledgeSourcesModule } from '../knowledge-sources/knowledge-sources.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { RejectionsModule } from '../rejections/rejections.module';
import { ReviewGatesModule } from '../review-gates/review-gates.module';
import { VacancyModule } from '../vacancy/vacancy.module';
import { ComparisonSummaryService } from './comparison-summary.service';
import { WorkspaceForkService } from './workspace-fork.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [
    PrismaModule,
    SlugModule,
    CompanyModule,
    VacancyModule,
    ArtifactStorageModule,
    ArtifactsModule,
    KnowledgeSourcesModule,
    PipelineModule,
    ReviewGatesModule,
    ApplicationTrackingModule,
    RejectionsModule,
    QueueModule,
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspaceForkService,
    ComparisonSummaryService,
  ],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
