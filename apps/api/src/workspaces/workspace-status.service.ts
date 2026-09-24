import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ApplicationWorkspace, Prisma, WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TRANSITIONS: Record<WorkspaceStatus, WorkspaceStatus[]> = {
  [WorkspaceStatus.source_saved]: [WorkspaceStatus.analysis_running],
  // analysis_running -> analysis_running: re-running an analysis whose process died mid-way
  // (the workspace stays analysis_running); concurrency is guarded by the PromptRun unique index.
  [WorkspaceStatus.analysis_running]: [
    WorkspaceStatus.analysis_running,
    WorkspaceStatus.paused_after_analysis,
    WorkspaceStatus.failed,
  ],
  [WorkspaceStatus.analysis_ready]: [
    WorkspaceStatus.analysis_ready,
    WorkspaceStatus.skipped,
  ],
  [WorkspaceStatus.paused_after_analysis]: [
    WorkspaceStatus.paused_after_analysis,
    WorkspaceStatus.cv_generation_running,
    WorkspaceStatus.analysis_ready,
    WorkspaceStatus.skipped,
  ],
  [WorkspaceStatus.skipped]: [WorkspaceStatus.cv_generation_running],
  [WorkspaceStatus.cv_generation_running]: [
    WorkspaceStatus.cv_draft_ready,
    WorkspaceStatus.failed,
  ],
  // cv_draft_ready / paused_after_cv_draft -> cv_draft_ready: regenerate the CV draft (ADR-029)
  // before the pre-PDF check gate has been entered.
  [WorkspaceStatus.cv_draft_ready]: [
    WorkspaceStatus.cv_draft_ready,
    WorkspaceStatus.pre_pdf_check_ready,
    WorkspaceStatus.paused_after_cv_draft,
  ],
  [WorkspaceStatus.paused_after_cv_draft]: [
    WorkspaceStatus.cv_draft_ready,
    WorkspaceStatus.pre_pdf_check_ready,
    WorkspaceStatus.paused_after_cv_draft,
  ],
  // cv_draft_ready: ISSUE-363 — regenerating the CV draft with selected Prompt 3 findings is
  // reachable from either of these two statuses (Prompt2Service.ALLOWED_STATUSES) and always
  // ends the workspace back at cv_draft_ready so the human re-clears CV draft review and the
  // pre-PDF check gate against the new draft (ADR-026 semantics unchanged).
  [WorkspaceStatus.pre_pdf_check_ready]: [
    WorkspaceStatus.paused_before_export,
    WorkspaceStatus.cv_draft_ready,
  ],
  // export_running: ISSUE-401 — exportCv claims paused_before_export -> export_running
  // atomically before rendering, so a second concurrent export is rejected.
  [WorkspaceStatus.paused_before_export]: [
    WorkspaceStatus.export_running,
    WorkspaceStatus.cv_pdf_generated,
    WorkspaceStatus.failed,
    WorkspaceStatus.cv_draft_ready,
  ],
  [WorkspaceStatus.export_running]: [
    WorkspaceStatus.cv_pdf_generated,
    WorkspaceStatus.failed,
  ],
  [WorkspaceStatus.cv_pdf_generated]: [
    WorkspaceStatus.cv_pdf_generated,
    WorkspaceStatus.final_check_ready,
    WorkspaceStatus.cover_letter_generated,
    WorkspaceStatus.ready_to_apply,
    WorkspaceStatus.applied,
    WorkspaceStatus.archived,
  ],
  [WorkspaceStatus.final_check_ready]: [
    WorkspaceStatus.cover_letter_generated,
    WorkspaceStatus.ready_to_apply,
    WorkspaceStatus.applied,
    WorkspaceStatus.archived,
  ],
  [WorkspaceStatus.ready_to_apply]: [
    WorkspaceStatus.applied,
    WorkspaceStatus.archived,
  ],
  [WorkspaceStatus.cover_letter_generated]: [
    WorkspaceStatus.cover_letter_generated,
    WorkspaceStatus.ready_to_apply,
    WorkspaceStatus.applied,
    WorkspaceStatus.archived,
  ],
  [WorkspaceStatus.applied]: [
    WorkspaceStatus.rejected,
    WorkspaceStatus.archived,
  ],
  [WorkspaceStatus.rejected]: [WorkspaceStatus.archived],
  [WorkspaceStatus.archived]: [],
  // failed -> analysis_running: a failed Prompt 1 run may be retried (the only retry path that
  // existed before ISSUE-401 enforced the machine); the broader failed dead end is ISSUE-307.
  [WorkspaceStatus.failed]: [WorkspaceStatus.analysis_running],
};

type WorkspaceClient = Pick<Prisma.TransactionClient, 'applicationWorkspace'>;

export interface TransitionOptions {
  data?: Prisma.ApplicationWorkspaceUncheckedUpdateManyInput;
  // Extra conditions the row must still satisfy (e.g. the decision the caller validated).
  guard?: Prisma.ApplicationWorkspaceWhereInput;
  client?: WorkspaceClient;
}

@Injectable()
export class WorkspaceStatusService {
  constructor(private readonly prisma: PrismaService) {}

  isValidTransition(from: WorkspaceStatus, to: WorkspaceStatus): boolean {
    return TRANSITIONS[from].includes(to);
  }

  assertValidTransition(from: WorkspaceStatus, to: WorkspaceStatus): void {
    if (!this.isValidTransition(from, to)) {
      throw new BadRequestException(
        `Invalid workspace status transition: "${from}" -> "${to}"`,
      );
    }
  }

  // Compare-and-set: the row is only updated while it is still in one of the expected `from`
  // statuses, so a concurrent request that already moved it gets a 409 instead of silently
  // overwriting (or double-running) a step.
  async transition(
    workspaceId: string,
    from: WorkspaceStatus | WorkspaceStatus[],
    to: WorkspaceStatus,
    options: TransitionOptions = {},
  ): Promise<ApplicationWorkspace> {
    const { data = {}, guard = {}, client = this.prisma } = options;
    const fromStatuses = Array.isArray(from) ? from : [from];
    for (const status of fromStatuses) {
      this.assertValidTransition(status, to);
    }

    const { count } = await client.applicationWorkspace.updateMany({
      where: { ...guard, id: workspaceId, status: { in: fromStatuses } },
      data: { ...data, status: to },
    });
    if (count !== 1) {
      throw new ConflictException(
        `Workspace "${workspaceId}" is no longer in status ` +
          `"${fromStatuses.join('" or "')}" — it was changed by another request`,
      );
    }

    return client.applicationWorkspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
  }
}
