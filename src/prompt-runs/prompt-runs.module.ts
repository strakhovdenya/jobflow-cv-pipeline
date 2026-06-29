import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptRunsService } from './prompt-runs.service';

@Module({
  imports: [PrismaModule],
  providers: [PromptRunsService],
  exports: [PromptRunsService],
})
export class PromptRunsModule {}
