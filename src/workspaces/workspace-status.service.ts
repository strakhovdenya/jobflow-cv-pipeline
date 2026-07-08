import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';

const TRANSITIONS: Record<WorkspaceStatus, WorkspaceStatus[]> = {
  [WorkspaceStatus.source_saved]: [WorkspaceStatus.analysis_running],
  [WorkspaceStatus.analysis_running]: [
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
  [WorkspaceStatus.cv_draft_ready]: [
    WorkspaceStatus.export_running,
    WorkspaceStatus.paused_after_cv_draft,
  ],
  [WorkspaceStatus.paused_after_cv_draft]: [
    WorkspaceStatus.export_running,
    WorkspaceStatus.paused_after_cv_draft,
  ],
  [WorkspaceStatus.pre_pdf_check_ready]: [],
  [WorkspaceStatus.paused_before_export]: [],
  [WorkspaceStatus.export_running]: [
    WorkspaceStatus.cv_pdf_generated,
    WorkspaceStatus.failed,
  ],
  [WorkspaceStatus.cv_pdf_generated]: [],
  [WorkspaceStatus.final_check_ready]: [],
  [WorkspaceStatus.ready_to_apply]: [],
  [WorkspaceStatus.cover_letter_generated]: [],
  [WorkspaceStatus.applied]: [],
  [WorkspaceStatus.rejected]: [],
  [WorkspaceStatus.archived]: [],
  [WorkspaceStatus.failed]: [],
};

@Injectable()
export class WorkspaceStatusService {
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
}
