import { Module } from '@nestjs/common';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RejectionsService } from './rejections.service';

@Module({
  imports: [PrismaModule, ArtifactStorageModule, ArtifactsModule],
  providers: [RejectionsService],
  exports: [RejectionsService],
})
export class RejectionsModule {}
