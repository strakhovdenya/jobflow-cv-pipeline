import { Module } from '@nestjs/common';
import { ArtifactStorageService } from './artifact-storage.service';

@Module({
  providers: [ArtifactStorageService],
  exports: [ArtifactStorageService],
})
export class ArtifactStorageModule {}
