import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceStatusModule } from '../workspaces/workspace-status.module';
import { ApplicationTrackingService } from './application-tracking.service';

@Module({
  imports: [PrismaModule, WorkspaceStatusModule],
  providers: [ApplicationTrackingService],
  exports: [ApplicationTrackingService],
})
export class ApplicationTrackingModule {}
