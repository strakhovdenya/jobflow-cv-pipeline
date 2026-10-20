import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StepFailureService } from './step-failure.service';
import { WorkspaceStatusService } from './workspace-status.service';

@Module({
  imports: [PrismaModule],
  providers: [WorkspaceStatusService, StepFailureService],
  exports: [WorkspaceStatusService, StepFailureService],
})
export class WorkspaceStatusModule {}
