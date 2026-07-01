import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  UserReviewState,
  VacancyDecision,
  WorkspaceStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewAction } from './dto/submit-decision.dto';
import { OverrideTargetDecision } from './dto/override-skip.dto';
import { ReviewGatesService } from './review-gates.service';

const WORKSPACE_ID = 'ws-gate-1';

const makeWorkspace = (
  decision: VacancyDecision = VacancyDecision.apply,
  status: WorkspaceStatus = WorkspaceStatus.paused_after_analysis,
) => ({
  id: WORKSPACE_ID,
  status,
  currentDecision: decision,
  reviewState: UserReviewState.pending_review,
});

describe('ReviewGatesService', () => {
  let service: ReviewGatesService;
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
        ReviewGatesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReviewGatesService>(ReviewGatesService);
  });

  describe('approve_apply', () => {
    it('transitions status to cv_generation_running and sets canProceedToPrompt2 true', async () => {
      const workspace = makeWorkspace(VacancyDecision.apply);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.cv_generation_running,
        reviewState: UserReviewState.approved,
      });

      const result = await service.submitDecision(
        WORKSPACE_ID,
        ReviewAction.approve_apply,
      );

      expect(result.status).toBe(WorkspaceStatus.cv_generation_running);
      expect(result.reviewState).toBe(UserReviewState.approved);
      expect(result.currentDecision).toBe(VacancyDecision.apply);
      expect(result.canProceedToPrompt2).toBe(true);
    });

    it('throws BadRequestException when currentDecision is not apply', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(VacancyDecision.maybe),
      );

      await expect(
        service.submitDecision(WORKSPACE_ID, ReviewAction.approve_apply),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve_maybe', () => {
    it('transitions status to cv_generation_running and sets canProceedToPrompt2 true', async () => {
      const workspace = makeWorkspace(VacancyDecision.maybe);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.cv_generation_running,
        reviewState: UserReviewState.approved,
      });

      const result = await service.submitDecision(
        WORKSPACE_ID,
        ReviewAction.approve_maybe,
      );

      expect(result.status).toBe(WorkspaceStatus.cv_generation_running);
      expect(result.reviewState).toBe(UserReviewState.approved);
      expect(result.currentDecision).toBe(VacancyDecision.maybe);
      expect(result.canProceedToPrompt2).toBe(true);
    });
  });

  describe('pause', () => {
    it('keeps status at paused_after_analysis and sets canProceedToPrompt2 false', async () => {
      const workspace = makeWorkspace(VacancyDecision.apply);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        status: WorkspaceStatus.paused_after_analysis,
        reviewState: UserReviewState.pending_review,
      });

      const result = await service.submitDecision(
        WORKSPACE_ID,
        ReviewAction.pause,
      );

      expect(result.status).toBe(WorkspaceStatus.paused_after_analysis);
      expect(result.reviewState).toBe(UserReviewState.pending_review);
      expect(result.canProceedToPrompt2).toBe(false);
    });

    it('does not change currentDecision on pause', async () => {
      const workspace = makeWorkspace(VacancyDecision.maybe);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        reviewState: UserReviewState.pending_review,
      });

      await service.submitDecision(WORKSPACE_ID, ReviewAction.pause);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentDecision: VacancyDecision.maybe,
          }),
        }),
      );
    });
  });

  describe('change_to_skip', () => {
    it('sets currentDecision to skip, reviewState to overridden, status stays paused_after_analysis', async () => {
      const workspace = makeWorkspace(VacancyDecision.apply);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      prismaMock.applicationWorkspace.update.mockResolvedValue({
        ...workspace,
        currentDecision: VacancyDecision.skip,
        reviewState: UserReviewState.overridden,
        status: WorkspaceStatus.paused_after_analysis,
      });

      const result = await service.submitDecision(
        WORKSPACE_ID,
        ReviewAction.change_to_skip,
      );

      expect(result.currentDecision).toBe(VacancyDecision.skip);
      expect(result.reviewState).toBe(UserReviewState.overridden);
      expect(result.status).toBe(WorkspaceStatus.paused_after_analysis);
      expect(result.canProceedToPrompt2).toBe(false);
    });

    it('throws BadRequestException when currentDecision is already skip', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(VacancyDecision.skip),
      );

      await expect(
        service.submitDecision(WORKSPACE_ID, ReviewAction.change_to_skip),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('error cases', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(
        service.submitDecision('unknown-id', ReviewAction.approve_apply),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when workspace is not in paused_after_analysis', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(VacancyDecision.apply, WorkspaceStatus.source_saved),
      );

      await expect(
        service.submitDecision(WORKSPACE_ID, ReviewAction.approve_apply),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

describe('ReviewGatesService — overrideSkip', () => {
  let service: ReviewGatesService;
  let prismaMock: {
    applicationWorkspace: { findUnique: jest.Mock; update: jest.Mock };
    decisionOverride: { create: jest.Mock };
    generatedArtifact: {
      findMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const skippedWorkspace = {
    id: WORKSPACE_ID,
    status: WorkspaceStatus.skipped,
    currentDecision: VacancyDecision.skip,
    reviewState: UserReviewState.overridden,
  };

  const overriddenWorkspace = (toDecision: VacancyDecision) => ({
    ...skippedWorkspace,
    status: WorkspaceStatus.cv_generation_running,
    currentDecision: toDecision,
    reviewState: UserReviewState.overridden,
  });

  beforeEach(async () => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      decisionOverride: {
        create: jest.fn(),
      },
      generatedArtifact: {
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewGatesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReviewGatesService>(ReviewGatesService);
  });

  it('transitions skipped workspace to cv_generation_running with manual_override_apply and creates audit record', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      skippedWorkspace,
    );
    prismaMock.decisionOverride.create.mockResolvedValue({ id: 'ov-1' });
    prismaMock.applicationWorkspace.update.mockResolvedValue(
      overriddenWorkspace(VacancyDecision.manual_override_apply),
    );

    const result = await service.overrideSkip(WORKSPACE_ID, {
      targetDecision: OverrideTargetDecision.apply,
    });

    expect(result.status).toBe(WorkspaceStatus.cv_generation_running);
    expect(result.toDecision).toBe(VacancyDecision.manual_override_apply);
    expect(result.canProceedToPrompt2).toBe(true);
    expect(prismaMock.decisionOverride.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException when workspace status is not skipped, and creates no audit record', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue({
      ...skippedWorkspace,
      status: WorkspaceStatus.paused_after_analysis,
    });

    await expect(
      service.overrideSkip(WORKSPACE_ID, {
        targetDecision: OverrideTargetDecision.apply,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.decisionOverride.create).not.toHaveBeenCalled();
  });

  it('does not touch GeneratedArtifact records during override', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      skippedWorkspace,
    );
    prismaMock.decisionOverride.create.mockResolvedValue({ id: 'ov-1' });
    prismaMock.applicationWorkspace.update.mockResolvedValue(
      overriddenWorkspace(VacancyDecision.manual_override_apply),
    );

    await service.overrideSkip(WORKSPACE_ID, {
      targetDecision: OverrideTargetDecision.apply,
    });

    expect(prismaMock.generatedArtifact.findMany).not.toHaveBeenCalled();
    expect(prismaMock.generatedArtifact.delete).not.toHaveBeenCalled();
    expect(prismaMock.generatedArtifact.deleteMany).not.toHaveBeenCalled();
  });

  it('stores fromDecision, toDecision, reviewState, reasonNote correctly in audit record', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      skippedWorkspace,
    );
    prismaMock.decisionOverride.create.mockResolvedValue({ id: 'ov-2' });
    prismaMock.applicationWorkspace.update.mockResolvedValue(
      overriddenWorkspace(VacancyDecision.manual_override_maybe),
    );

    await service.overrideSkip(WORKSPACE_ID, {
      targetDecision: OverrideTargetDecision.maybe,
      reasonNote: 'Worth a closer look',
    });

    expect(prismaMock.decisionOverride.create).toHaveBeenCalledWith({
      data: {
        workspaceId: WORKSPACE_ID,
        fromDecision: VacancyDecision.skip,
        toDecision: VacancyDecision.manual_override_maybe,
        reviewState: UserReviewState.overridden,
        reasonNote: 'Worth a closer look',
      },
    });
  });
});
