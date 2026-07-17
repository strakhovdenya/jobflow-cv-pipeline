import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewGatesService } from './review-gates.service';

@Module({
  imports: [PrismaModule],
  providers: [ReviewGatesService],
  exports: [ReviewGatesService],
})
export class ReviewGatesModule {}
