import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  UserReviewState,
  VacancyDecision,
  WorkspaceStatus,
} from '@prisma/client';
import { Prompt1Service } from '../pipeline/prompt1/prompt1.service';
import { Prompt2Service } from '../pipeline/prompt2/prompt2.service';
import { SkipReasonService } from '../pipeline/skip/skip-reason.service';
import { ReviewAction } from '../review-gates/dto/submit-decision.dto';
import { ReviewGatesService } from '../review-gates/review-gates.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesController } from './workspaces.controller';
import {
  WorkspaceCreationResult,
  WorkspacesService,
} from './workspaces.service';

const mockCreationResult: WorkspaceCreationResult = {
  id: 'ws-id-1',
  status: WorkspaceStatus.source_saved,
  companySlug: 'Action1',
  roleSlug: 'Backend_Developer_Node_js',
  workspaceSlug: '2026_06_29_Action1_Backend_Developer_Node_js',
  folderPath: '2026_06_29_Action1_Backend_Developer_Node_js',
  vacancySourcePath:
    '2026_06_29_Action1_Backend_Developer_Node_js/00_vacancy_source.txt',
  vacancyTextHash: 'abc123hash',
  companyId: 'co-id-1',
  jobVacancyId: 'vac-id-1',
  createdAt: new Date('2026-06-29T10:00:00Z'),
};

const mockWorkspace = {
  id: 'ws-id-1',
  workspaceSlug: '2026_06_29_Action1_Backend_Developer_Node_js',
  status: WorkspaceStatus.source_saved,
  company: { id: 'co-id-1', nameOriginal: 'Action1', companySlug: 'Action1' },
  jobVacancy: {
    id: 'vac-id-1',
    roleTitleOriginal: 'Backend Developer Node.js',
    roleSlug: 'Backend_Developer_Node_js',
  },
  createdAt: new Date('2026-06-29T10:00:00Z'),
};

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let service: jest.Mocked<WorkspacesService>;
  let module: TestingModule;

  beforeEach(async () => {
    const mockService = {
      createWorkspace: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const mockPrompt1Service = {
      runAnalysis: jest.fn(),
    };

    const mockPrompt2Service: Partial<Prompt2Service> = {
      generateCvContent: jest.fn(),
    };

    const mockReviewGatesService: Partial<ReviewGatesService> = {
      submitDecision: jest.fn(),
    };

    const mockSkipReasonService: Partial<SkipReasonService> = {
      confirmSkip: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: mockService },
        { provide: Prompt1Service, useValue: mockPrompt1Service },
        { provide: Prompt2Service, useValue: mockPrompt2Service },
        { provide: ReviewGatesService, useValue: mockReviewGatesService },
        { provide: SkipReasonService, useValue: mockSkipReasonService },
      ],
    }).compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    service = module.get(WorkspacesService);
  });

  describe('POST /workspaces', () => {
    it('creates workspace and returns creation result', async () => {
      service.createWorkspace.mockResolvedValue(mockCreationResult);

      const dto: CreateWorkspaceDto = {
        companyNameOriginal: 'Action1',
        roleTitleOriginal: 'Backend Developer Node.js',
        vacancyText: 'We are looking for a backend developer...',
      };

      const result = await controller.create(dto);

      expect(service.createWorkspace).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('ws-id-1');
      expect(result.status).toBe(WorkspaceStatus.source_saved);
      expect(result.companySlug).toBe('Action1');
      expect(result.vacancySourcePath).toContain('00_vacancy_source.txt');
    });
  });

  describe('GET /workspaces', () => {
    it('returns list of workspaces ordered by createdAt desc', async () => {
      service.findAll.mockResolvedValue([mockWorkspace as any]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-id-1');
    });
  });

  describe('GET /workspaces/:id', () => {
    it('returns workspace when found', async () => {
      service.findById.mockResolvedValue(mockWorkspace as any);

      const result = await controller.findById('ws-id-1');

      expect(service.findById).toHaveBeenCalledWith('ws-id-1');
      expect(result.id).toBe('ws-id-1');
    });

    it('throws NotFoundException when workspace not found', async () => {
      service.findById.mockResolvedValue(null);

      await expect(controller.findById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /workspaces/:id/generate-cv-content', () => {
    it('delegates to Prompt2Service and returns result', async () => {
      const mockResult = {
        success: true,
        promptRunId: 'run-id-1',
        aiRunId: 'ai-run-id-1',
        workspaceStatus: WorkspaceStatus.cv_draft_ready,
        artifactPaths: { md: 'path.md', json: 'path.json' },
      };

      const prompt2Service = module.get<Prompt2Service>(Prompt2Service);
      jest
        .spyOn(prompt2Service, 'generateCvContent')
        .mockResolvedValue(mockResult);

      const result = await controller.generateCvContent('ws-id-1');

      expect(prompt2Service.generateCvContent).toHaveBeenCalledWith('ws-id-1');
      expect(result.workspaceStatus).toBe(WorkspaceStatus.cv_draft_ready);
    });
  });

  describe('POST /workspaces/:id/review-decision', () => {
    it('delegates to ReviewGatesService and returns result', async () => {
      const mockResult = {
        workspaceId: 'ws-id-1',
        action: ReviewAction.approve_apply,
        currentDecision: VacancyDecision.apply,
        reviewState: UserReviewState.approved,
        status: WorkspaceStatus.cv_generation_running,
        canProceedToPrompt2: true,
      };

      const reviewGatesService =
        module.get<ReviewGatesService>(ReviewGatesService);
      jest
        .spyOn(reviewGatesService, 'submitDecision')
        .mockResolvedValue(mockResult);

      const result = await controller.reviewDecision('ws-id-1', {
        action: ReviewAction.approve_apply,
      });

      expect(reviewGatesService.submitDecision).toHaveBeenCalledWith(
        'ws-id-1',
        ReviewAction.approve_apply,
      );
      expect(result.canProceedToPrompt2).toBe(true);
      expect(result.status).toBe(WorkspaceStatus.cv_generation_running);
    });
  });
});
