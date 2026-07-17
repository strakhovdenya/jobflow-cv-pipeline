import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoverLetterDraft, WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoverLetterDraftDto } from './dto/create-cover-letter-draft.dto';

@Injectable()
export class CoverLetterDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    dto: CreateCoverLetterDraftDto,
  ): Promise<CoverLetterDraft> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    if (workspace.status === WorkspaceStatus.skipped) {
      throw new BadRequestException(
        'Cannot generate a cover letter draft for a skipped workspace unless the skip decision has been manually overridden',
      );
    }

    return this.prisma.coverLetterDraft.create({
      data: {
        workspaceId,
        promptRunId: dto.promptRunId ?? null,
        letterType: dto.letterType,
      },
    });
  }
}
