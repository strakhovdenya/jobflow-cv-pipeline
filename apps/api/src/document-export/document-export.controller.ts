import { Controller, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiBadRequestResponse({
    description:
      'Export blocked before it starts; no file is written and a paused_before_export workspace keeps its status (a legacy export_running workspace refused by the registry gate is returned to paused_before_export). Causes: the workspace is not in paused_before_export/export_running; candidate-profile.config.ts contains placeholder data; 02_targeted_cv_content.json is missing or invalid, or 03_pre_pdf_check.json is invalid; the CV draft has no valid overclaiming_check.registry_snapshot (regenerate the draft); or the content to be exported — the draft with the pre-PDF check corrections applied — violates the career registry snapshot ("Export blocked: registry violations …", each violation with its field path; regenerate the draft, then re-run or skip the pre-PDF check).',
  })
  @Post(':id/export-cv')
  async exportCv(@Param('id') id: string) {
    return this.documentExportService.exportCv(id);
  }
}
