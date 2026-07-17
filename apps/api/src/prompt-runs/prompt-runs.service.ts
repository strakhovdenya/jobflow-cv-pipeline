import { Injectable } from '@nestjs/common';
import { PromptRun, PromptRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePromptRunDto {
  workspaceId: string;
  promptStep: string;
  templateId: string;
  templateVersion: number;
  inputHash?: string;
  sourceSnapshot?: string;
}

export interface CompletePromptRunDto {
  aiRunId: string;
  outputArtifactIds?: string[];
}

@Injectable()
export class PromptRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromptRunDto): Promise<PromptRun> {
    return this.prisma.promptRun.create({
      data: {
        workspaceId: dto.workspaceId,
        promptStep: dto.promptStep,
        templateId: dto.templateId,
        templateVersion: dto.templateVersion,
        inputHash: dto.inputHash,
        sourceSnapshot: dto.sourceSnapshot,
        status: PromptRunStatus.pending,
      },
    });
  }

  async markRunning(id: string): Promise<PromptRun> {
    return this.prisma.promptRun.update({
      where: { id },
      data: { status: PromptRunStatus.running },
    });
  }

  async complete(id: string, dto: CompletePromptRunDto): Promise<PromptRun> {
    return this.prisma.promptRun.update({
      where: { id },
      data: {
        status: PromptRunStatus.completed,
        aiRunId: dto.aiRunId,
        outputArtifactIds: dto.outputArtifactIds
          ? JSON.stringify(dto.outputArtifactIds)
          : undefined,
      },
    });
  }

  async fail(id: string): Promise<PromptRun> {
    return this.prisma.promptRun.update({
      where: { id },
      data: { status: PromptRunStatus.failed },
    });
  }

  async findById(id: string): Promise<PromptRun | null> {
    return this.prisma.promptRun.findUnique({ where: { id } });
  }
}
