import { Module } from '@nestjs/common';
import { ArtifactStorageModule } from '../artifacts/artifact-storage.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentExportController } from './document-export.controller';
import { DocumentExportService } from './document-export.service';
import { HtmlRendererService } from './html-renderer.service';
import { PdfExportService } from './pdf-export.service';

@Module({
  imports: [PrismaModule, ArtifactStorageModule, ArtifactsModule],
  controllers: [DocumentExportController],
  providers: [DocumentExportService, HtmlRendererService, PdfExportService],
})
export class DocumentExportModule {}
