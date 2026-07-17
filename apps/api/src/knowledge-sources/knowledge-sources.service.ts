import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { HashService } from '../artifacts/hash.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportKnowledgeSourceDto {
  filePath: string;
  sourceType: string;
  versionLabel?: string;
}

@Injectable()
export class KnowledgeSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async importSource(dto: ImportKnowledgeSourceDto): Promise<KnowledgeSource> {
    const contentHash = await this.hashService.hashFile(dto.filePath);
    return this.prisma.knowledgeSource.create({
      data: {
        filePath: dto.filePath,
        sourceType: dto.sourceType,
        contentHash,
        versionLabel: dto.versionLabel ?? null,
      },
    });
  }

  async activate(id: string): Promise<KnowledgeSource> {
    await this.assertExists(id);
    return this.prisma.knowledgeSource.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string): Promise<KnowledgeSource> {
    await this.assertExists(id);
    return this.prisma.knowledgeSource.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findActive(): Promise<KnowledgeSource[]> {
    return this.prisma.knowledgeSource.findMany({
      where: { isActive: true },
      orderBy: { importedAt: 'desc' },
    });
  }

  private async assertExists(id: string): Promise<void> {
    const record = await this.prisma.knowledgeSource.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`KnowledgeSource "${id}" not found`);
    }
  }
}
