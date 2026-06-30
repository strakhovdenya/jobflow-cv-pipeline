import { Injectable } from '@nestjs/common';
import { AiRun } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SaveSuccessfulAiRunDto {
  provider: string;
  model: string;
  requestHash?: string;
  responseHash?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  usageRawJson?: string;
  costEstimate?: number;
  costCurrency?: string;
  pricingConfigVersion?: string;
}

export interface SaveFailedAiRunDto {
  provider: string;
  model: string;
  requestHash?: string;
  responseHash?: string;
  errorMessage: string;
}

@Injectable()
export class AiRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveSuccess(dto: SaveSuccessfulAiRunDto): Promise<AiRun> {
    return this.prisma.aiRun.create({
      data: {
        provider: dto.provider,
        model: dto.model,
        status: 'completed',
        requestHash: dto.requestHash,
        responseHash: dto.responseHash,
        inputTokens: dto.inputTokens,
        outputTokens: dto.outputTokens,
        totalTokens: dto.totalTokens,
        cachedInputTokens: dto.cachedInputTokens,
        reasoningTokens: dto.reasoningTokens,
        usageRawJson: dto.usageRawJson,
        costEstimate: dto.costEstimate,
        costCurrency: dto.costCurrency,
        pricingConfigVersion: dto.pricingConfigVersion,
      },
    });
  }

  async saveFailed(dto: SaveFailedAiRunDto): Promise<AiRun> {
    return this.prisma.aiRun.create({
      data: {
        provider: dto.provider,
        model: dto.model,
        status: 'failed',
        requestHash: dto.requestHash,
        responseHash: dto.responseHash,
        errorMessage: dto.errorMessage,
      },
    });
  }
}
