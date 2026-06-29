import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';
import { HashService } from './hash.service';

@Module({
  imports: [PrismaModule],
  controllers: [ArtifactsController],
  providers: [ArtifactsService, HashService],
  exports: [ArtifactsService, HashService],
})
export class ArtifactsModule {}
