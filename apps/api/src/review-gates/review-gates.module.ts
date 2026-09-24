import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceStatusModule } from '../workspaces/workspace-status.module';
import { ReviewGatesService } from './review-gates.service';

@Module({
  imports: [PrismaModule, WorkspaceStatusModule],
  providers: [ReviewGatesService],
  exports: [ReviewGatesService],
})
export class ReviewGatesModule {}
