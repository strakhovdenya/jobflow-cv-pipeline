import { Injectable } from '@nestjs/common';
import { EvidenceItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCategory(category: string): Promise<EvidenceItem[]> {
    return this.prisma.evidenceItem.findMany({
      where: { category },
      orderBy: { claimArea: 'asc' },
    });
  }

  async findAll(): Promise<EvidenceItem[]> {
    return this.prisma.evidenceItem.findMany({
      orderBy: [{ category: 'asc' }, { claimArea: 'asc' }],
    });
  }
}
