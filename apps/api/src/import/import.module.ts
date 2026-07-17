import { Module } from '@nestjs/common';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { SlugModule } from '../common/slug/slug.module';
import { CompanyModule } from '../company/company.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VacancyModule } from '../vacancy/vacancy.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    SlugModule,
    PrismaModule,
    ArtifactsModule,
    ArtifactStorageModule,
    CompanyModule,
    VacancyModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
