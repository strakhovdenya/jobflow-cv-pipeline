import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceStatusService } from './workspace-status.service';

@Module({
  imports: [PrismaModule],
  providers: [WorkspaceStatusService],
  exports: [WorkspaceStatusService],
})
export class WorkspaceStatusModule {}
