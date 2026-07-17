import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicationTrackingService } from './application-tracking.service';

@Module({
  imports: [PrismaModule],
  providers: [ApplicationTrackingService],
  exports: [ApplicationTrackingService],
})
export class ApplicationTrackingModule {}
