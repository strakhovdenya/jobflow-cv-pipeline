import { Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DocumentExportService,
  ExportCvResult,
} from './document-export.service';

@ApiTags('document-export')
@Controller('workspaces')
export class DocumentExportController {
  constructor(private readonly documentExportService: DocumentExportService) {}

  @ApiOperation({ summary: 'Export the approved CV draft to PDF' })
  @ApiCreatedResponse({ type: ExportCvResult })
  @Post(':id/export-cv')
  async exportCv(@Param('id') id: string) {
    return this.documentExportService.exportCv(id);
  }
}
