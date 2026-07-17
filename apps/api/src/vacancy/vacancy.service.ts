import { Injectable } from '@nestjs/common';
import { JobVacancy, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VacancyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.JobVacancyCreateInput): Promise<JobVacancy> {
    return this.prisma.jobVacancy.create({ data });
  }

  async findById(id: string): Promise<JobVacancy | null> {
    return this.prisma.jobVacancy.findUnique({ where: { id } });
  }
}
