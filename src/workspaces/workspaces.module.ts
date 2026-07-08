import { Module } from '@nestjs/common';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { SlugModule } from '../common/slug/slug.module';
import { CompanyModule } from '../company/company.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewGatesModule } from '../review-gates/review-gates.module';
import { VacancyModule } from '../vacancy/vacancy.module';
import { WorkspaceStatusService } from './workspace-status.service';
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
    PipelineModule,
    ReviewGatesModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceStatusService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
