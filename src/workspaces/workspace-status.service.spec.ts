import { BadRequestException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { WorkspaceStatusService } from './workspace-status.service';

describe('WorkspaceStatusService', () => {
  let service: WorkspaceStatusService;

  beforeEach(() => {
    service = new WorkspaceStatusService();
  });

  describe('valid transitions', () => {
    const validPairs: [WorkspaceStatus, WorkspaceStatus][] = [
      [WorkspaceStatus.source_saved, WorkspaceStatus.analysis_running],
      [WorkspaceStatus.analysis_running, WorkspaceStatus.paused_after_analysis],
      [WorkspaceStatus.analysis_running, WorkspaceStatus.failed],
      [
        WorkspaceStatus.paused_after_analysis,
        WorkspaceStatus.paused_after_analysis,
      ],
      [
        WorkspaceStatus.paused_after_analysis,
        WorkspaceStatus.cv_generation_running,
      ],
      [WorkspaceStatus.paused_after_analysis, WorkspaceStatus.analysis_ready],
      [WorkspaceStatus.paused_after_analysis, WorkspaceStatus.skipped],
      [WorkspaceStatus.analysis_ready, WorkspaceStatus.analysis_ready],
      [WorkspaceStatus.analysis_ready, WorkspaceStatus.skipped],
      [WorkspaceStatus.skipped, WorkspaceStatus.cv_generation_running],
      [WorkspaceStatus.cv_generation_running, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.cv_generation_running, WorkspaceStatus.failed],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.export_running],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.paused_after_cv_draft],
      [WorkspaceStatus.paused_after_cv_draft, WorkspaceStatus.export_running],
      [
        WorkspaceStatus.paused_after_cv_draft,
        WorkspaceStatus.paused_after_cv_draft,
      ],
      [WorkspaceStatus.export_running, WorkspaceStatus.cv_pdf_generated],
      [WorkspaceStatus.export_running, WorkspaceStatus.failed],
    ];

    it.each(validPairs)('allows %s -> %s', (from, to) => {
      expect(service.isValidTransition(from, to)).toBe(true);
      expect(() => service.assertValidTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidPairs: [WorkspaceStatus, WorkspaceStatus][] = [
      [WorkspaceStatus.skipped, WorkspaceStatus.export_running],
      [WorkspaceStatus.skipped, WorkspaceStatus.skipped],
      [WorkspaceStatus.source_saved, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.cv_pdf_generated, WorkspaceStatus.export_running],
      [WorkspaceStatus.cv_pdf_generated, WorkspaceStatus.cv_pdf_generated],
      [WorkspaceStatus.failed, WorkspaceStatus.source_saved],
      [WorkspaceStatus.failed, WorkspaceStatus.analysis_running],
      [WorkspaceStatus.analysis_running, WorkspaceStatus.cv_generation_running],
      [WorkspaceStatus.paused_after_analysis, WorkspaceStatus.export_running],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.skipped],
    ];

    it.each(invalidPairs)('rejects %s -> %s', (from, to) => {
      expect(service.isValidTransition(from, to)).toBe(false);
      expect(() => service.assertValidTransition(from, to)).toThrow(
        BadRequestException,
      );
    });

    it('includes both statuses in the error message', () => {
      expect(() =>
        service.assertValidTransition(
          WorkspaceStatus.skipped,
          WorkspaceStatus.export_running,
        ),
      ).toThrow(/skipped.*export_running/);
    });
  });
});
