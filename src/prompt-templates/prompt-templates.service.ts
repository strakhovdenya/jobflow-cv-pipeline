import { Injectable } from '@nestjs/common';
import { PromptTemplate } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePromptTemplateDto {
  promptKey: string;
  step: string;
  content: string;
  description?: string;
}

@Injectable()
export class PromptTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromptTemplateDto): Promise<PromptTemplate> {
    const latest = await this.prisma.promptTemplate.findFirst({
      where: { step: dto.step },
      orderBy: { version: 'desc' },
    });

    const version = latest ? latest.version + 1 : 1;

    return this.prisma.promptTemplate.create({
      data: {
        promptKey: dto.promptKey,
        step: dto.step,
        version,
        content: dto.content,
        description: dto.description,
        isActive: false,
      },
    });
  }

  async activate(id: string): Promise<PromptTemplate> {
    const template = await this.prisma.promptTemplate.findUniqueOrThrow({
      where: { id },
    });

    await this.prisma.promptTemplate.updateMany({
      where: { step: template.step, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.promptTemplate.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async findActive(step: string): Promise<PromptTemplate | null> {
    return this.prisma.promptTemplate.findFirst({
      where: { step, isActive: true },
    });
  }

  async findByStep(step: string): Promise<PromptTemplate[]> {
    return this.prisma.promptTemplate.findMany({
      where: { step },
      orderBy: { version: 'desc' },
    });
  }
}
