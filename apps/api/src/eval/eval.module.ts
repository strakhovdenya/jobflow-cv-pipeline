import { Module } from '@nestjs/common';
import { CvQualityGuardService } from './cv-quality-guard.service';

@Module({
  providers: [CvQualityGuardService],
  exports: [CvQualityGuardService],
})
export class EvalModule {}
