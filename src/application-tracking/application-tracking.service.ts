import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationWorkspace, WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAppliedDto } from './dto/mark-applied.dto';
import { MarkRejectedDto } from './dto/mark-rejected.dto';

const READY_TO_APPLY_VALID_STATUSES: WorkspaceStatus[] = [
  WorkspaceStatus.cv_pdf_generated,
  WorkspaceStatus.final_check_ready,
  WorkspaceStatus.cover_letter_generated,
];

const APPLIED_VALID_STATUSES: WorkspaceStatus[] = [
  WorkspaceStatus.cv_pdf_generated,
  WorkspaceStatus.final_check_ready,
  WorkspaceStatus.cover_letter_generated,
  WorkspaceStatus.ready_to_apply,
];

const REJECTED_VALID_STATUSES: WorkspaceStatus[] = [WorkspaceStatus.applied];

const ARCHIVED_VALID_STATUSES: WorkspaceStatus[] = [
  WorkspaceStatus.ready_to_apply,
  WorkspaceStatus.cv_pdf_generated,
  WorkspaceStatus.final_check_ready,
  WorkspaceStatus.cover_letter_generated,
  WorkspaceStatus.applied,
  WorkspaceStatus.rejected,
];

@Injectable()
export class ApplicationTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async markReadyToApply(workspaceId: string): Promise<ApplicationWorkspace> {
    const workspace = await this.findWorkspaceOrThrow(workspaceId);
    this.assertStatus(
      workspace.status,
      READY_TO_APPLY_VALID_STATUSES,
      'mark ready to apply',
    );

    return this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.ready_to_apply },
    });
  }

  async markApplied(
    workspaceId: string,
    dto: MarkAppliedDto,
  ): Promise<ApplicationWorkspace> {
    const workspace = await this.findWorkspaceOrThrow(workspaceId);
    this.assertStatus(workspace.status, APPLIED_VALID_STATUSES, 'mark applied');

    return this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: {
        status: WorkspaceStatus.applied,
        appliedAt: new Date(),
        appliedVia: dto.appliedVia,
        notes: dto.notes,
        submittedCvArtifactId: dto.submittedCvArtifactId,
        submittedCoverLetterArtifactId: dto.submittedCoverLetterArtifactId,
      },
    });
  }

  async markRejected(
    workspaceId: string,
    dto: MarkRejectedDto,
  ): Promise<ApplicationWorkspace> {
    const workspace = await this.findWorkspaceOrThrow(workspaceId);
    this.assertStatus(
      workspace.status,
      REJECTED_VALID_STATUSES,
      'mark rejected',
    );

    return this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: {
        status: WorkspaceStatus.rejected,
        rejectedAt: new Date(),
        rejectionSummary: dto.rejectionSummary,
        notes: dto.notes,
      },
    });
  }

  async markArchived(workspaceId: string): Promise<ApplicationWorkspace> {
    const workspace = await this.findWorkspaceOrThrow(workspaceId);
    this.assertStatus(workspace.status, ARCHIVED_VALID_STATUSES, 'archive');

    return this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.archived, isArchived: true },
    });
  }

  private async findWorkspaceOrThrow(
    workspaceId: string,
  ): Promise<ApplicationWorkspace> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }
    return workspace;
  }

  private assertStatus(
    status: WorkspaceStatus,
    validStatuses: WorkspaceStatus[],
    actionLabel: string,
  ): void {
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Workspace is in status "${status}" — cannot ${actionLabel} (requires one of: ${validStatuses.join(', ')})`,
      );
    }
  }
}
