import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiRunsService } from './ai-runs.service';

@Module({
  imports: [PrismaModule],
  providers: [AiRunsService],
  exports: [AiRunsService],
})
export class AiRunsModule {}
