import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImportScanResultDto } from './dto/import-scan-result.dto';
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
}
