import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserReviewState, VacancyDecision, WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewAction } from './dto/submit-decision.dto';
import { OverrideSkipDto, OverrideTargetDecision } from './dto/override-skip.dto';

export interface OverrideSkipResult {
  workspaceId: string;
  fromDecision: VacancyDecision;
  toDecision: VacancyDecision;
  reviewState: UserReviewState;
  status: WorkspaceStatus;
  canProceedToPrompt2: boolean;
}

export interface ReviewDecisionResult {
  workspaceId: string;
  action: ReviewAction;
  currentDecision: VacancyDecision;
  reviewState: UserReviewState;
  status: WorkspaceStatus;
  canProceedToPrompt2: boolean;
}

@Injectable()
export class ReviewGatesService {
  constructor(private readonly prisma: PrismaService) {}

  async submitDecision(
    workspaceId: string,
    action: ReviewAction,
  ): Promise<ReviewDecisionResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    if (workspace.status !== WorkspaceStatus.paused_after_analysis) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — review decision requires status "paused_after_analysis"`,
      );
    }

    const currentDecision = workspace.currentDecision;

    let newDecision: VacancyDecision;
    let newReviewState: UserReviewState;
    let newStatus: WorkspaceStatus;

    switch (action) {
      case ReviewAction.approve_apply:
        if (currentDecision !== VacancyDecision.apply) {
          throw new BadRequestException(
            `Action "approve_apply" requires currentDecision "apply", but got "${currentDecision}"`,
          );
        }
        newDecision = VacancyDecision.apply;
        newReviewState = UserReviewState.approved;
        newStatus = WorkspaceStatus.cv_generation_running;
        break;

      case ReviewAction.approve_maybe:
        if (currentDecision !== VacancyDecision.maybe) {
          throw new BadRequestException(
            `Action "approve_maybe" requires currentDecision "maybe", but got "${currentDecision}"`,
          );
        }
        newDecision = VacancyDecision.maybe;
        newReviewState = UserReviewState.approved;
        newStatus = WorkspaceStatus.cv_generation_running;
        break;

      case ReviewAction.pause:
        newDecision = currentDecision ?? VacancyDecision.apply;
        newReviewState = UserReviewState.pending_review;
        newStatus = WorkspaceStatus.paused_after_analysis;
        break;

      case ReviewAction.change_to_skip:
        if (currentDecision === VacancyDecision.skip) {
          throw new BadRequestException(
            `Action "change_to_skip" cannot be applied when currentDecision is already "skip"`,
          );
        }
        newDecision = VacancyDecision.skip;
        newReviewState = UserReviewState.overridden;
        newStatus = WorkspaceStatus.paused_after_analysis;
        break;
    }

    const updated = await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: {
        status: newStatus,
        currentDecision: newDecision,
        reviewState: newReviewState,
      },
    });

    return {
      workspaceId: updated.id,
      action,
      currentDecision: updated.currentDecision!,
      reviewState: updated.reviewState!,
      status: updated.status,
      canProceedToPrompt2: updated.status === WorkspaceStatus.cv_generation_running,
    };
  }

  async overrideSkip(
    workspaceId: string,
    dto: OverrideSkipDto,
  ): Promise<OverrideSkipResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    if (workspace.status !== WorkspaceStatus.skipped) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — override-skip requires status "skipped"`,
      );
    }

    const fromDecision = workspace.currentDecision ?? VacancyDecision.skip;
    const toDecision =
      dto.targetDecision === OverrideTargetDecision.maybe
        ? VacancyDecision.manual_override_maybe
        : VacancyDecision.manual_override_apply;
    const newReviewState = UserReviewState.overridden;
    const newStatus = WorkspaceStatus.cv_generation_running;

    const [, updated] = await this.prisma.$transaction([
      this.prisma.decisionOverride.create({
        data: {
          workspaceId,
          fromDecision,
          toDecision,
          reviewState: newReviewState,
          reasonNote: dto.reasonNote ?? null,
        },
      }),
      this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: {
          status: newStatus,
          currentDecision: toDecision,
          reviewState: newReviewState,
        },
      }),
    ]);

    return {
      workspaceId: updated.id,
      fromDecision,
      toDecision,
      reviewState: updated.reviewState!,
      status: updated.status,
      canProceedToPrompt2: true,
    };
  }
}
