import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImportScanResultDto } from './dto/import-scan-result.dto';
import {
  ImportPreviewRequestDto,
  ImportPreviewResultDto,
} from './dto/import-preview.dto';
import { ImportService } from './import.service';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @ApiOperation({
    summary:
      'Scan the configured legacy Company/YYYY.MM.DD folder tree (IMPORT_ROOT) and detect importable artifacts (read-only, no import side effects)',
  })
  @Get('scan')
  async scan(): Promise<ImportScanResultDto[]> {
    return this.importService.scanRoot();
  }

  @ApiOperation({
    summary:
      'Preview one scanned folder with optional company/role correction and duplicate ' +
      'detection (read-only, creates no ApplicationWorkspace/GeneratedArtifact records)',
  })
  @Post('preview')
  async preview(
    @Body() dto: ImportPreviewRequestDto,
  ): Promise<ImportPreviewResultDto> {
    return this.importService.previewImport(dto.folderPath, {
      companyNameOverride: dto.companyNameOverride,
      roleTitleOverride: dto.roleTitleOverride,
    });
  }
}
