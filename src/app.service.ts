import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppVersion(): { name: string; version: string } {
    return { name: 'jobflow-cv-pipeline', version: '0.1.0' };
  }
}
