import { BadRequestException, ConflictException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceStatusService } from './workspace-status.service';

describe('WorkspaceStatusService', () => {
  let service: WorkspaceStatusService;
  let updateMany: jest.Mock;
  let findUniqueOrThrow: jest.Mock;

  beforeEach(() => {
    updateMany = jest.fn();
    findUniqueOrThrow = jest.fn();
    const prisma = {
      applicationWorkspace: { updateMany, findUniqueOrThrow },
    } as unknown as PrismaService;
    service = new WorkspaceStatusService(prisma);
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
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.pre_pdf_check_ready],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.paused_after_cv_draft],
      [
        WorkspaceStatus.paused_after_cv_draft,
        WorkspaceStatus.pre_pdf_check_ready,
      ],
      [
        WorkspaceStatus.paused_after_cv_draft,
        WorkspaceStatus.paused_after_cv_draft,
      ],
      [
        WorkspaceStatus.pre_pdf_check_ready,
        WorkspaceStatus.paused_before_export,
      ],
      [WorkspaceStatus.paused_before_export, WorkspaceStatus.cv_pdf_generated],
      [WorkspaceStatus.paused_before_export, WorkspaceStatus.failed],
      // ISSUE-363: regenerate CV draft with selected Prompt 3 findings
      [WorkspaceStatus.pre_pdf_check_ready, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.paused_before_export, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.export_running, WorkspaceStatus.cv_pdf_generated],
      [WorkspaceStatus.export_running, WorkspaceStatus.failed],
      [WorkspaceStatus.cv_pdf_generated, WorkspaceStatus.cv_pdf_generated],
      [WorkspaceStatus.cv_pdf_generated, WorkspaceStatus.final_check_ready],
      [
        WorkspaceStatus.cv_pdf_generated,
        WorkspaceStatus.cover_letter_generated,
      ],
      [
        WorkspaceStatus.final_check_ready,
        WorkspaceStatus.cover_letter_generated,
      ],
      // ISSUE-401
      [WorkspaceStatus.failed, WorkspaceStatus.analysis_running],
      [WorkspaceStatus.analysis_running, WorkspaceStatus.analysis_running],
      [WorkspaceStatus.paused_before_export, WorkspaceStatus.export_running],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.paused_after_cv_draft, WorkspaceStatus.cv_draft_ready],
      [WorkspaceStatus.cv_pdf_generated, WorkspaceStatus.ready_to_apply],
      [WorkspaceStatus.cover_letter_generated, WorkspaceStatus.applied],
      [WorkspaceStatus.ready_to_apply, WorkspaceStatus.applied],
      [WorkspaceStatus.applied, WorkspaceStatus.rejected],
      [WorkspaceStatus.rejected, WorkspaceStatus.archived],
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
      [WorkspaceStatus.final_check_ready, WorkspaceStatus.final_check_ready],
      [WorkspaceStatus.failed, WorkspaceStatus.source_saved],
      [WorkspaceStatus.failed, WorkspaceStatus.cv_generation_running],
      [WorkspaceStatus.cv_pdf_generated, WorkspaceStatus.analysis_running],
      [WorkspaceStatus.skipped, WorkspaceStatus.analysis_running],
      [WorkspaceStatus.analysis_running, WorkspaceStatus.cv_generation_running],
      [WorkspaceStatus.paused_after_analysis, WorkspaceStatus.export_running],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.skipped],
      [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.export_running],
      [WorkspaceStatus.paused_after_cv_draft, WorkspaceStatus.export_running],
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

  describe('transition (compare-and-set)', () => {
    it('updates status and returns the fresh row when exactly one row matched', async () => {
      const row = { id: 'w1', status: WorkspaceStatus.analysis_running };
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue(row);

      const result = await service.transition(
        'w1',
        WorkspaceStatus.source_saved,
        WorkspaceStatus.analysis_running,
        { data: { score: 3 } },
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'w1', status: { in: [WorkspaceStatus.source_saved] } },
        data: { score: 3, status: WorkspaceStatus.analysis_running },
      });
      expect(result).toBe(row);
    });

    it('throws ConflictException when a concurrent request already moved the row', async () => {
      updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.transition(
          'w1',
          WorkspaceStatus.source_saved,
          WorkspaceStatus.analysis_running,
        ),
      ).rejects.toThrow(ConflictException);
      expect(findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('adds the guard conditions to the compare-and-set filter', async () => {
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue({ id: 'w1' });

      await service.transition(
        'w1',
        WorkspaceStatus.paused_after_analysis,
        WorkspaceStatus.cv_generation_running,
        { guard: { currentDecision: 'apply' } },
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          currentDecision: 'apply',
          id: 'w1',
          status: { in: [WorkspaceStatus.paused_after_analysis] },
        },
        data: { status: WorkspaceStatus.cv_generation_running },
      });
    });

    it('rejects an invalid transition before touching the database', async () => {
      await expect(
        service.transition(
          'w1',
          WorkspaceStatus.skipped,
          WorkspaceStatus.analysis_running,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('validates every status when several starting statuses are allowed', async () => {
      await expect(
        service.transition(
          'w1',
          [WorkspaceStatus.cv_draft_ready, WorkspaceStatus.skipped],
          WorkspaceStatus.cv_draft_ready,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(updateMany).not.toHaveBeenCalled();
    });

    it('uses the supplied transaction client instead of the default one', async () => {
      const txUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const txFind = jest.fn().mockResolvedValue({ id: 'w1' });

      await service.transition(
        'w1',
        WorkspaceStatus.skipped,
        WorkspaceStatus.cv_generation_running,
        {
          client: {
            applicationWorkspace: {
              updateMany: txUpdateMany,
              findUniqueOrThrow: txFind,
            },
          } as never,
        },
      );

      expect(txUpdateMany).toHaveBeenCalledTimes(1);
      expect(updateMany).not.toHaveBeenCalled();
    });
  });
});
