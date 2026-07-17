import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationTrackingService } from './application-tracking.service';

const WORKSPACE_ID = 'ws-tracking-1';

const makeWorkspace = (status: WorkspaceStatus) => ({
  id: WORKSPACE_ID,
  status,
  isArchived: false,
});

describe('ApplicationTrackingService', () => {
  let service: ApplicationTrackingService;
  let prismaMock: {
    applicationWorkspace: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationTrackingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ApplicationTrackingService>(
      ApplicationTrackingService,
    );
  });

  describe('markReadyToApply', () => {
    it.each([
      WorkspaceStatus.cv_pdf_generated,
      WorkspaceStatus.final_check_ready,
      WorkspaceStatus.cover_letter_generated,
    ])('transitions %s to ready_to_apply', async (status) => {
      const workspace = makeWorkspace(status);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.ready_to_apply,
      });

      const result = await service.markReadyToApply(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
        where: { id: WORKSPACE_ID },
        data: { status: WorkspaceStatus.ready_to_apply },
      });
      expect(result.status).toBe(WorkspaceStatus.ready_to_apply);
    });

    it('throws BadRequestException for an invalid predecessor status', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.source_saved),
      );

      await expect(service.markReadyToApply(WORKSPACE_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(service.markReadyToApply(WORKSPACE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markApplied', () => {
    it.each([
      WorkspaceStatus.cv_pdf_generated,
      WorkspaceStatus.final_check_ready,
      WorkspaceStatus.cover_letter_generated,
      WorkspaceStatus.ready_to_apply,
    ])('transitions %s to applied and stores metadata', async (status) => {
      const workspace = makeWorkspace(status);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.applied,
        appliedVia: 'LinkedIn',
      });

      const result = await service.markApplied(WORKSPACE_ID, {
        appliedVia: 'LinkedIn',
        notes: 'Applied via referral',
        submittedCvArtifactId: 'art-cv-1',
        submittedCoverLetterArtifactId: 'art-cl-1',
      });

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
        where: { id: WORKSPACE_ID },
        data: expect.objectContaining({
          status: WorkspaceStatus.applied,
          appliedAt: expect.any(Date),
          appliedVia: 'LinkedIn',
          notes: 'Applied via referral',
          submittedCvArtifactId: 'art-cv-1',
          submittedCoverLetterArtifactId: 'art-cl-1',
        }),
      });
      expect(result.status).toBe(WorkspaceStatus.applied);
    });

    it('throws BadRequestException for an invalid predecessor status', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.source_saved),
      );

      await expect(service.markApplied(WORKSPACE_ID, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(service.markApplied(WORKSPACE_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markRejected', () => {
    it('transitions applied to rejected and stores metadata', async () => {
      const workspace = makeWorkspace(WorkspaceStatus.applied);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.rejected,
      });

      const result = await service.markRejected(WORKSPACE_ID, {
        rejectionSummary: 'Position filled internally',
        notes: 'Recruiter follow-up call',
      });

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
        where: { id: WORKSPACE_ID },
        data: expect.objectContaining({
          status: WorkspaceStatus.rejected,
          rejectedAt: expect.any(Date),
          rejectionSummary: 'Position filled internally',
          notes: 'Recruiter follow-up call',
        }),
      });
      expect(result.status).toBe(WorkspaceStatus.rejected);
    });

    it.each([
      WorkspaceStatus.cv_pdf_generated,
      WorkspaceStatus.ready_to_apply,
      WorkspaceStatus.source_saved,
    ])(
      'throws BadRequestException when status is %s (not applied)',
      async (status) => {
        prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
          makeWorkspace(status),
        );

        await expect(service.markRejected(WORKSPACE_ID, {})).rejects.toThrow(
          BadRequestException,
        );
        expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
      },
    );

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(service.markRejected(WORKSPACE_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markArchived', () => {
    it.each([
      WorkspaceStatus.ready_to_apply,
      WorkspaceStatus.cv_pdf_generated,
      WorkspaceStatus.final_check_ready,
      WorkspaceStatus.cover_letter_generated,
      WorkspaceStatus.applied,
      WorkspaceStatus.rejected,
    ])('transitions %s to archived and sets isArchived', async (status) => {
      const workspace = makeWorkspace(status);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.archived,
        isArchived: true,
      });

      const result = await service.markArchived(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith({
        where: { id: WORKSPACE_ID },
        data: { status: WorkspaceStatus.archived, isArchived: true },
      });
      expect(result.status).toBe(WorkspaceStatus.archived);
    });

    it('throws BadRequestException for an invalid predecessor status', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.source_saved),
      );

      await expect(service.markArchived(WORKSPACE_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(service.markArchived(WORKSPACE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
