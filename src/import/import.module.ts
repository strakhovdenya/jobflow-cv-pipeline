import { Module } from '@nestjs/common';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { SlugModule } from '../common/slug/slug.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [SlugModule, PrismaModule, ArtifactsModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
