import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CoverLetterDraftsService } from './cover-letter-drafts.service';

@Module({
  imports: [PrismaModule],
  providers: [CoverLetterDraftsService],
  exports: [CoverLetterDraftsService],
})
export class CoverLetterDraftsModule {}
