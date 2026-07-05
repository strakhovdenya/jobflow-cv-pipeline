import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check' })
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @ApiOperation({ summary: 'Get application version' })
  @Get('version')
  version() {
    return this.appService.getAppVersion();
  }
}
