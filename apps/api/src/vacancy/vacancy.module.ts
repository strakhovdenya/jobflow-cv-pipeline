import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VacancyService } from './vacancy.service';

@Module({
  imports: [PrismaModule],
  providers: [VacancyService],
  exports: [VacancyService],
})
export class VacancyModule {}
