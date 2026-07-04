import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EvidenceGuardService } from './evidence-guard.service';
import { EvidenceService } from './evidence.service';

@Module({
  imports: [PrismaModule],
  providers: [EvidenceService, EvidenceGuardService],
  exports: [EvidenceService, EvidenceGuardService],
})
export class EvidenceModule {}
