import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptTemplatesService } from './prompt-templates.service';

@Module({
  imports: [PrismaModule],
  providers: [PromptTemplatesService],
  exports: [PromptTemplatesService],
})
export class PromptTemplatesModule {}
