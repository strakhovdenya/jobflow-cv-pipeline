import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, PromptRun, PromptRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePromptRunDto {
  workspaceId: string;
  promptStep: string;
  templateId: string;
  templateVersion: number;
  inputHash?: string;
  sourceSnapshot?: string;
  feedbackNotes?: string;
}

export interface CompletePromptRunDto {
  aiRunId: string;
  outputArtifactIds?: string[];
}

// An in-flight run older than this is assumed to belong to a crashed process and is failed so it
// cannot block the step forever (see the partial unique index on PromptRun).
export const STALE_PROMPT_RUN_MS = 15 * 60 * 1000;

const UNIQUE_VIOLATION_CODE = 'P2002';

@Injectable()
export class PromptRunsService {
  private readonly logger = new Logger(PromptRunsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromptRunDto): Promise<PromptRun> {
    await this.failStaleActiveRuns(dto.workspaceId, dto.promptStep);

    try {
      return await this.prisma.promptRun.create({
        data: {
          workspaceId: dto.workspaceId,
          promptStep: dto.promptStep,
          templateId: dto.templateId,
          templateVersion: dto.templateVersion,
          inputHash: dto.inputHash,
          sourceSnapshot: dto.sourceSnapshot,
          feedbackNotes: dto.feedbackNotes,
          status: PromptRunStatus.pending,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION_CODE
      ) {
        throw new ConflictException(
          `Step "${dto.promptStep}" is already running for workspace "${dto.workspaceId}"`,
        );
      }
      throw error;
    }
  }

  private async failStaleActiveRuns(
    workspaceId: string,
    promptStep: string,
  ): Promise<void> {
    await this.prisma.promptRun.updateMany({
      where: {
        workspaceId,
        promptStep,
        status: { in: [PromptRunStatus.pending, PromptRunStatus.running] },
        updatedAt: { lt: new Date(Date.now() - STALE_PROMPT_RUN_MS) },
      },
      data: { status: PromptRunStatus.failed },
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

  // For cleanup after an unexpected error: must never mask the error that is being handled, and
  // must not overwrite a run that already completed (the error may come from a later step).
  async failSafely(id: string): Promise<void> {
    try {
      await this.prisma.promptRun.updateMany({
        where: {
          id,
          status: { in: [PromptRunStatus.pending, PromptRunStatus.running] },
        },
        data: { status: PromptRunStatus.failed },
      });
    } catch (error) {
      this.logger.warn(
        `Could not mark PromptRun "${id}" as failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findById(id: string): Promise<PromptRun | null> {
    return this.prisma.promptRun.findUnique({ where: { id } });
  }
}
