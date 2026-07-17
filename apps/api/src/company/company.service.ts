import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }
}
