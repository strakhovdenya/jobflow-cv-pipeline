import { Module } from '@nestjs/common';
import { SlugModule } from '../common/slug/slug.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [SlugModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
