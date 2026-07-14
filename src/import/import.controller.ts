import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ImportScanResultDto } from './dto/import-scan-result.dto';
import { ImportService } from './import.service';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @ApiOperation({
    summary:
      'Scan a legacy Company/YYYY.MM.DD folder tree and detect importable artifacts (read-only, no import side effects)',
  })
  @ApiQuery({
    name: 'rootPath',
    description: 'Absolute path to the legacy import root folder',
  })
  @Get('scan')
  async scan(
    @Query('rootPath') rootPath: string,
  ): Promise<ImportScanResultDto[]> {
    return this.importService.scanRoot(rootPath);
  }
}
