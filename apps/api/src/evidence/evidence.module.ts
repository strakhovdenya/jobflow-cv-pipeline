import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EvidenceGuardService } from './evidence-guard.service';
import { EvidenceService } from './evidence.service';
import { SafeWordingService } from './safe-wording.service';

@Module({
  imports: [PrismaModule],
  providers: [EvidenceService, EvidenceGuardService, SafeWordingService],
  exports: [EvidenceService, EvidenceGuardService, SafeWordingService],
})
export class EvidenceModule {}
