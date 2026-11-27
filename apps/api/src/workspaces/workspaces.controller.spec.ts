import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  UserReviewState,
  VacancyDecision,
  WorkspaceStatus,
} from '@prisma/client';
import { estimateCost } from '../ai/pricing';
import { emptyUsageBreakdown } from '../ai/usage-breakdown';
import { ApplicationTrackingService } from '../application-tracking/application-tracking.service';
import { AiStepsService } from '../queue/ai-steps.service';
import { RejectionsService } from '../rejections/rejections.service';
import { ReviewAction } from '../review-gates/dto/submit-decision.dto';
import { ReviewGatesService } from '../review-gates/review-gates.service';
import {
  ComparisonSummary,
  ComparisonSummaryService,
} from './comparison-summary.service';
import { ComparisonSummaryDto } from './dto/comparison-summary.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
  ForkWorkspaceDto,
  ForkWorkspaceResultDto,
} from './dto/fork-workspace.dto';
import { ForkResult, WorkspaceForkService } from './workspace-fork.service';
import {
  WorkspaceExperimentDetailDto,
  WorkspaceSourcesStatusDto,
  WorkspacesController,
} from './workspaces.controller';
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
  storageRoot: '/home/os-user/storage/applications',
  workspacePath: '2026_06_29_Action1_Backend_Developer_Node_js',
  sourceImportedPath: '/home/os-user/legacy/folder',
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
      getWorkspaceDetail: jest.fn(),
      appendManualNote: jest.fn(),
    };

    const mockReviewGatesService: Partial<ReviewGatesService> = {
      submitDecision: jest.fn(),
      skipPrePdfCheck: jest.fn(),
    };

    const mockApplicationTrackingService: Partial<ApplicationTrackingService> =
      {
        markReadyToApply: jest.fn(),
        markApplied: jest.fn(),
        markRejected: jest.fn(),
        markArchived: jest.fn(),
      };

    const mockRejectionsService: Partial<RejectionsService> = {
      saveRejectionText: jest.fn(),
    };

    const mockAiStepsService: Partial<AiStepsService> = {
      enqueue: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
      getJob: jest.fn(),
      findActiveJob: jest.fn().mockResolvedValue(null),
    };

    module = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: mockService },
        { provide: ReviewGatesService, useValue: mockReviewGatesService },
        {
          provide: ApplicationTrackingService,
          useValue: mockApplicationTrackingService,
        },
        { provide: RejectionsService, useValue: mockRejectionsService },
        { provide: AiStepsService, useValue: mockAiStepsService },
        { provide: WorkspaceForkService, useValue: { fork: jest.fn() } },
        {
          provide: ComparisonSummaryService,
          useValue: { buildSummary: jest.fn() },
        },
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
    it('findAll omits storageRoot and workspacePath', async () => {
      service.findAll.mockResolvedValue([mockWorkspace as any]);

      const result = await controller.findAll();

      expect(result[0]).not.toHaveProperty('storageRoot');
      expect(result[0]).not.toHaveProperty('workspacePath');
      expect(result[0]).not.toHaveProperty('sourceImportedPath');
      expect(result[0].id).toBe('ws-id-1');
    });

    it('returns list of workspaces ordered by createdAt desc', async () => {
      service.findAll.mockResolvedValue([mockWorkspace as any]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-id-1');
    });
  });

  describe('GET /workspaces/:id', () => {
    it('findById omits storageRoot and workspacePath', async () => {
      service.getWorkspaceDetail.mockResolvedValue({
        ...mockWorkspace,
        artifacts: [],
        manualNotes: [],
        manualNoteForcedClaims: [],
        manualNoteForcedClaimsUnreadable: [],
      } as any);

      const result = await controller.findById('ws-id-1');

      expect(result).not.toHaveProperty('storageRoot');
      expect(result).not.toHaveProperty('workspacePath');
      expect(result).toMatchObject({ id: 'ws-id-1', artifacts: [] });
    });

    it('exposes the last step error of the workspace', async () => {
      const lastStepErrorAt = new Date('2026-10-20T12:00:00Z');
      service.getWorkspaceDetail.mockResolvedValue({
        ...mockWorkspace,
        lastStepErrorStep: 'prompt_2',
        lastStepErrorMessage: 'CV generation failed: network error',
        lastStepErrorAt,
        artifacts: [],
        manualNotes: [],
        manualNoteForcedClaims: [],
        manualNoteForcedClaimsUnreadable: [],
      } as any);

      const result = await controller.findById('ws-id-1');

      expect(result).toMatchObject({
        lastStepErrorStep: 'prompt_2',
        lastStepErrorMessage: 'CV generation failed: network error',
        lastStepErrorAt,
      });
    });

    it('returns workspace with status, decision, score and artifact summary', async () => {
      const mockDetail = {
        ...mockWorkspace,
        currentDecision: VacancyDecision.apply,
        score: 78,
        artifacts: [
          {
            id: 'artifact-1',
            artifactType: 'vacancy_source',
            canonicalFileName: '00_vacancy_source.txt',
            downloadFileName: null,
            isLatest: true,
            version: 1,
            mimeType: 'text/plain',
            fileSizeBytes: 512,
            createdAt: new Date('2026-06-29T10:00:00Z'),
          },
          {
            id: 'artifact-2',
            artifactType: 'vacancy_analysis_md',
            canonicalFileName: '01_vacancy_analysis.md',
            downloadFileName: null,
            isLatest: true,
            version: 1,
            mimeType: 'text/markdown',
            fileSizeBytes: 2048,
            createdAt: new Date('2026-06-29T11:00:00Z'),
          },
          {
            id: 'artifact-3',
            artifactType: 'vacancy_analysis_json',
            canonicalFileName: '01_vacancy_analysis.json',
            downloadFileName: null,
            isLatest: true,
            version: 1,
            mimeType: 'application/json',
            fileSizeBytes: 1024,
            createdAt: new Date('2026-06-29T11:00:00Z'),
          },
          {
            id: 'artifact-4',
            artifactType: 'cv_export_pdf',
            canonicalFileName: '04_cv_export.pdf',
            downloadFileName: 'CV_Action1_Backend_Developer_Node_js.pdf',
            isLatest: true,
            version: 1,
            mimeType: 'application/pdf',
            fileSizeBytes: 119350,
            createdAt: new Date('2026-06-29T12:00:00Z'),
          },
        ],
      };
      service.getWorkspaceDetail.mockResolvedValue(mockDetail as any);

      const result = await controller.findById('ws-id-1');

      expect(service.getWorkspaceDetail).toHaveBeenCalledWith('ws-id-1');
      expect(result.id).toBe('ws-id-1');
      expect(result.status).toBe(WorkspaceStatus.source_saved);
      expect(result.currentDecision).toBe(VacancyDecision.apply);
      expect(result.score).toBe(78);
      expect(result.artifacts).toHaveLength(4);

      // asserted present via toHaveLength(4) above; non-null assertion is safe here
      const pdfEntry = result.artifacts.find(
        (a: any) => a.artifactType === 'cv_export_pdf',
      )!;
      expect(pdfEntry.canonicalFileName).toBe('04_cv_export.pdf');
      expect(pdfEntry.downloadFileName).toBe(
        'CV_Action1_Backend_Developer_Node_js.pdf',
      );

      const sourceEntry = result.artifacts.find(
        (a: any) => a.artifactType === 'vacancy_source',
      )!;
      expect(sourceEntry.canonicalFileName).toBe('00_vacancy_source.txt');
      expect(sourceEntry.downloadFileName).toBeNull();
    });

    it('exposes sourcesChangedSinceAnalysis in the workspace detail', async () => {
      const detailWith = (sourcesChangedSinceAnalysis: boolean) =>
        ({
          ...mockWorkspace,
          artifacts: [],
          manualNotes: [],
          manualNoteForcedClaims: [],
          manualNoteForcedClaimsUnreadable: [],
          sourcesChangedSinceAnalysis,
        }) as any;
      service.getWorkspaceDetail.mockResolvedValueOnce(detailWith(true));
      service.getWorkspaceDetail.mockResolvedValueOnce(detailWith(false));

      const changed = await controller.findById('ws-id-1');
      const unchanged = await controller.findById('ws-id-1');

      expect(changed.sourcesChangedSinceAnalysis).toBe(true);
      expect(unchanged.sourcesChangedSinceAnalysis).toBe(false);

      const documented = Reflect.getMetadata(
        'swagger/apiModelPropertiesArray',
        WorkspaceSourcesStatusDto.prototype,
      ) as string[];
      expect(documented).toContain(':sourcesChangedSinceAnalysis');
      const property = Reflect.getMetadata(
        'swagger/apiModelProperties',
        WorkspaceSourcesStatusDto.prototype,
        'sourcesChangedSinceAnalysis',
      ) as { type: unknown };
      expect(property.type).toBe(Boolean);
      const responses = Reflect.getMetadata(
        'swagger/apiResponse',
        WorkspacesController.prototype.findById,
      ) as Record<string, { type: unknown }>;
      expect(responses['200'].type).toBe(WorkspaceExperimentDetailDto);
      expect(WorkspaceExperimentDetailDto.prototype).toBeInstanceOf(
        WorkspaceSourcesStatusDto,
      );
    });

    it('throws NotFoundException when workspace not found', async () => {
      service.getWorkspaceDetail.mockResolvedValue(null);

      await expect(controller.findById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('includes the active background job of the workspace', async () => {
      service.getWorkspaceDetail.mockResolvedValue(mockWorkspace as any);
      const aiStepsService = module.get<AiStepsService>(AiStepsService);
      const activeJob = { jobId: 'job-7', step: 'prompt_2', state: 'active' };
      jest
        .spyOn(aiStepsService, 'findActiveJob')
        .mockResolvedValue(activeJob as never);

      const result = await controller.findById('ws-id-1');

      expect(result.activeJob).toEqual(activeJob);
    });

    it('still returns the workspace with no active job when the queue is unavailable', async () => {
      service.getWorkspaceDetail.mockResolvedValue(mockWorkspace as any);
      const aiStepsService = module.get<AiStepsService>(AiStepsService);
      jest
        .spyOn(aiStepsService, 'findActiveJob')
        .mockRejectedValue(new Error('Background queue is not configured'));

      const result = await controller.findById('ws-id-1');

      expect(result.id).toBe('ws-id-1');
      expect(result.activeJob).toBeNull();
    });
  });

  describe('AI step endpoints (background jobs)', () => {
    const cases: [string, () => Promise<unknown>, string][] = [
      ['run-analysis', () => controller.runAnalysis('ws-id-1'), 'prompt_1'],
      [
        'run-pre-pdf-check',
        () => controller.runPrePdfCheck('ws-id-1'),
        'prompt_3',
      ],
      [
        'run-final-check',
        () => controller.runFinalCheck('ws-id-1'),
        'prompt_5',
      ],
      [
        'generate-cover-letter',
        () => controller.generateCoverLetter('ws-id-1'),
        'cover_letter',
      ],
      ['confirm-skip', () => controller.confirmSkip('ws-id-1'), 'skip_reason'],
    ];

    it.each(cases)(
      'POST /workspaces/:id/%s enqueues the step and returns the job id',
      async (_route, call, step) => {
        const aiStepsService = module.get<AiStepsService>(AiStepsService);

        const result = await call();

        expect(aiStepsService.enqueue).toHaveBeenCalledWith(step, 'ws-id-1');
        expect(result).toEqual({ jobId: 'job-1' });
      },
    );
  });

  describe('POST /workspaces/:id/generate-cv-content', () => {
    it('enqueues Prompt 2 and returns the job id', async () => {
      const aiStepsService = module.get<AiStepsService>(AiStepsService);

      const result = await controller.generateCvContent('ws-id-1', {});

      expect(aiStepsService.enqueue).toHaveBeenCalledWith(
        'prompt_2',
        'ws-id-1',
        undefined,
      );
      expect(result).toEqual({ jobId: 'job-1' });
    });

    it('does not throw when the client sends no body at all (dto is undefined, not {})', async () => {
      const aiStepsService = module.get<AiStepsService>(AiStepsService);

      // Express/Nest resolves @Body() to undefined, not {}, when Content-Length is 0 — this is
      // exactly what the original "Generate CV draft" button (and every pre-ADR-029 caller) sends.
      await expect(
        controller.generateCvContent(
          'ws-id-1',
          undefined as unknown as { notes?: string },
        ),
      ).resolves.toEqual({ jobId: 'job-1' });
      expect(aiStepsService.enqueue).toHaveBeenCalledWith(
        'prompt_2',
        'ws-id-1',
        undefined,
      );
    });

    it('passes optional regenerate notes through to the job', async () => {
      const aiStepsService = module.get<AiStepsService>(AiStepsService);

      await controller.generateCvContent('ws-id-1', {
        notes: 'Emphasize the AWS experience more.',
      });

      expect(aiStepsService.enqueue).toHaveBeenCalledWith(
        'prompt_2',
        'ws-id-1',
        'Emphasize the AWS experience more.',
      );
    });
  });

  describe('GET /workspaces/:id/jobs/:jobId', () => {
    it('returns the job status of this workspace', async () => {
      const aiStepsService = module.get<AiStepsService>(AiStepsService);
      const status = {
        jobId: 'job-1',
        state: 'completed',
        data: { step: 'prompt_2', workspaceId: 'ws-id-1' },
      };
      jest.spyOn(aiStepsService, 'getJob').mockResolvedValue(status as never);

      const result = await controller.getJob('ws-id-1', 'job-1');

      expect(aiStepsService.getJob).toHaveBeenCalledWith('ws-id-1', 'job-1');
      expect(result).toEqual(status);
    });
  });

  describe('POST /workspaces/:id/skip-pre-pdf-check', () => {
    it('delegates to ReviewGatesService and returns result', async () => {
      const mockResult = {
        workspaceId: 'ws-id-1',
        status: WorkspaceStatus.paused_before_export,
      };

      const reviewGatesService =
        module.get<ReviewGatesService>(ReviewGatesService);
      jest
        .spyOn(reviewGatesService, 'skipPrePdfCheck')
        .mockResolvedValue(mockResult);

      const result = await controller.skipPrePdfCheck('ws-id-1');

      expect(reviewGatesService.skipPrePdfCheck).toHaveBeenCalledWith(
        'ws-id-1',
      );
      expect(result.status).toBe(WorkspaceStatus.paused_before_export);
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
        undefined,
      );
      expect(result.canProceedToPrompt2).toBe(true);
      expect(result.status).toBe(WorkspaceStatus.cv_generation_running);
    });
  });

  describe('POST /workspaces/:id/mark-ready-to-apply', () => {
    it('delegates to ApplicationTrackingService and returns result', async () => {
      const mockResult = {
        id: 'ws-id-1',
        status: WorkspaceStatus.ready_to_apply,
      };

      const applicationTrackingService = module.get<ApplicationTrackingService>(
        ApplicationTrackingService,
      );
      jest
        .spyOn(applicationTrackingService, 'markReadyToApply')
        .mockResolvedValue(mockResult as never);

      const result = await controller.markReadyToApply('ws-id-1');

      expect(applicationTrackingService.markReadyToApply).toHaveBeenCalledWith(
        'ws-id-1',
      );
      expect((result as { status: WorkspaceStatus }).status).toBe(
        WorkspaceStatus.ready_to_apply,
      );
    });
  });

  describe('POST /workspaces/:id/mark-applied', () => {
    it('delegates to ApplicationTrackingService and returns result', async () => {
      const mockResult = { id: 'ws-id-1', status: WorkspaceStatus.applied };

      const applicationTrackingService = module.get<ApplicationTrackingService>(
        ApplicationTrackingService,
      );
      jest
        .spyOn(applicationTrackingService, 'markApplied')
        .mockResolvedValue(mockResult as never);

      const dto = { appliedVia: 'LinkedIn' };
      const result = await controller.markApplied('ws-id-1', dto);

      expect(applicationTrackingService.markApplied).toHaveBeenCalledWith(
        'ws-id-1',
        dto,
      );
      expect((result as { status: WorkspaceStatus }).status).toBe(
        WorkspaceStatus.applied,
      );
    });
  });

  describe('POST /workspaces/:id/mark-rejected', () => {
    it('delegates to ApplicationTrackingService and returns result', async () => {
      const mockResult = { id: 'ws-id-1', status: WorkspaceStatus.rejected };

      const applicationTrackingService = module.get<ApplicationTrackingService>(
        ApplicationTrackingService,
      );
      jest
        .spyOn(applicationTrackingService, 'markRejected')
        .mockResolvedValue(mockResult as never);

      const dto = { rejectionSummary: 'Position filled internally' };
      const result = await controller.markRejected('ws-id-1', dto);

      expect(applicationTrackingService.markRejected).toHaveBeenCalledWith(
        'ws-id-1',
        dto,
      );
      expect((result as { status: WorkspaceStatus }).status).toBe(
        WorkspaceStatus.rejected,
      );
    });
  });

  describe('POST /workspaces/:id/archive', () => {
    it('delegates to ApplicationTrackingService and returns result', async () => {
      const mockResult = { id: 'ws-id-1', status: WorkspaceStatus.archived };

      const applicationTrackingService = module.get<ApplicationTrackingService>(
        ApplicationTrackingService,
      );
      jest
        .spyOn(applicationTrackingService, 'markArchived')
        .mockResolvedValue(mockResult as never);

      const result = await controller.archive('ws-id-1');

      expect(applicationTrackingService.markArchived).toHaveBeenCalledWith(
        'ws-id-1',
      );
      expect((result as { status: WorkspaceStatus }).status).toBe(
        WorkspaceStatus.archived,
      );
    });
  });

  describe('POST /workspaces/:id/rejection-text', () => {
    it('delegates to RejectionsService and returns result', async () => {
      const mockResult = {
        id: 'artifact-1',
        artifactType: 'rejection_feedback',
      };

      const rejectionsService =
        module.get<RejectionsService>(RejectionsService);
      jest
        .spyOn(rejectionsService, 'saveRejectionText')
        .mockResolvedValue(mockResult as never);

      const dto = { text: 'Position filled internally.' };
      const result = await controller.saveRejectionText('ws-id-1', dto);

      expect(rejectionsService.saveRejectionText).toHaveBeenCalledWith(
        'ws-id-1',
        dto,
      );
      expect((result as { artifactType: string }).artifactType).toBe(
        'rejection_feedback',
      );
    });
  });

  describe('POST /workspaces/:id/manual-note', () => {
    it('delegates to WorkspacesService.appendManualNote and returns the created note', async () => {
      const mockResult = {
        id: 'note-1',
        workspaceId: 'ws-id-1',
        text: 'No commercial AWS experience.',
        isLegacy: false,
        createdAt: new Date('2026-08-27T12:00:00.000Z'),
      };

      service.appendManualNote.mockResolvedValue(mockResult as never);

      const result = await controller.appendManualNote('ws-id-1', {
        note: 'No commercial AWS experience.',
      });

      expect(service.appendManualNote).toHaveBeenCalledWith(
        'ws-id-1',
        'No commercial AWS experience.',
      );
      expect((result as { text: string }).text).toBe(
        'No commercial AWS experience.',
      );
    });
  });

  describe('POST /workspaces/:id/fork and GET /workspaces/:id/comparison (ISSUE-716)', () => {
    const forkResult: ForkResult = {
      id: 'ws-fork-1',
      isNew: true,
      status: WorkspaceStatus.source_saved,
      workspaceSlug: '2026_11_27_Action1_Backend_Developer_Node_js_fork_1',
      forkedFromWorkspaceId: 'ws-id-1',
      comparisonGroupId: 'ws-id-1',
      analysisStrategy: AnalysisStrategy.c,
      contextLayout: ContextLayout.single,
      contextSourceSet: ContextSourceSet.full,
      carryOverRequirements: true,
      requestKey: '3f1c2b4a-8d7e-4f6a-9b0c-1d2e3f4a5b6c',
      vacancyTextHash: 'abc123hash',
      createdAt: new Date('2026-11-27T10:00:00Z'),
    };
    const usage = emptyUsageBreakdown();
    const estimate = estimateCost([]);
    const summary: ComparisonSummary = {
      workspaceId: 'ws-id-1',
      comparisonGroupId: 'ws-id-1',
      members: [
        {
          workspaceId: 'ws-id-1',
          workspaceSlug: 'slug',
          isRequested: true,
          isGroupRoot: true,
          forkedFromWorkspaceId: null,
          analysisStrategy: AnalysisStrategy.c,
          contextLayout: ContextLayout.single,
          contextSourceSet: ContextSourceSet.full,
          carryOverRequirements: false,
          status: WorkspaceStatus.paused_after_analysis,
          isArchived: false,
          activeJob: { state: 'none', jobId: null, step: null },
          lastStepError: { step: 'prompt_1', message: 'failed', at: null },
          currentDecision: VacancyDecision.maybe,
          originalDecision: VacancyDecision.maybe,
          score: 68,
          analysisPolicy: {
            decision: 'maybe',
            score: 68,
            advisoryDecision: 'apply',
            advisoryDiffers: true,
            borderline: true,
            borderlineReasons: ['near a boundary'],
            manualReviewRequired: true,
            decidingRule: 'B2',
            openQuestions: [{ condition: 'eligibility', note: '' }],
            policyVersion: 'policy',
          },
          stages: [
            {
              stepKey: 'analysis_x1',
              isCarriedOver: false,
              carriedOverFromWorkspaceId: null,
              promptRunCount: 1,
              callCount: 1,
              failedCallCount: 0,
              unmeasuredCallCount: 1,
              durationMs: 10,
              models: ['openai/gpt-6-luna'],
              usage,
              estimate,
            },
          ],
          totals: {
            callCount: 1,
            failedCallCount: 0,
            unmeasuredCallCount: 1,
            durationMs: 10,
            usage,
            estimate,
          },
        },
      ],
      inputEquality: {
        vacancyHash: { isEqual: true, unrecordedWorkspaceIds: [] },
        companyAndRole: { isEqual: true, unrecordedWorkspaceIds: [] },
        notes: { isEqual: true, unrecordedWorkspaceIds: [] },
        snapshot: { isEqual: true, unrecordedWorkspaceIds: [] },
        model: { isEqual: true, unrecordedWorkspaceIds: [] },
      },
    };

    // Every key of a sample object must be a documented property of its Swagger model, nested
    // models included; returns the paths that are not.
    const undocumentedPaths = (
      sample: Record<string, unknown>,
      model: { prototype: object },
      prefix = '',
    ): string[] => {
      const documented =
        (Reflect.getMetadata(
          'swagger/apiModelPropertiesArray',
          model.prototype,
        ) as string[] | undefined) ?? [];
      const missing: string[] = [];
      for (const [key, value] of Object.entries(sample)) {
        if (!documented.includes(`:${key}`)) {
          missing.push(`${prefix}${key}`);
          continue;
        }
        const property = Reflect.getMetadata(
          'swagger/apiModelProperties',
          model.prototype,
          key,
        ) as { type?: unknown };
        const nestedModel = property.type as
          (abstract new () => object) | undefined;
        const isNestedModel =
          typeof nestedModel === 'function' &&
          Reflect.getMetadata(
            'swagger/apiModelPropertiesArray',
            nestedModel.prototype,
          ) !== undefined;
        if (!isNestedModel || value === null || value === undefined) continue;
        const items = Array.isArray(value) ? value : [value];
        for (const item of items) {
          missing.push(
            ...undocumentedPaths(
              item as Record<string, unknown>,
              nestedModel as { prototype: object },
              `${prefix}${key}.`,
            ),
          );
        }
      }
      return missing;
    };

    it('forks a workspace through the fork service', async () => {
      const forkService = module.get(WorkspaceForkService);
      (forkService.fork as jest.Mock).mockResolvedValue(forkResult);
      const dto: ForkWorkspaceDto = {
        analysisStrategy: AnalysisStrategy.c,
        carryOverRequirements: true,
        requestKey: '3f1c2b4a-8d7e-4f6a-9b0c-1d2e3f4a5b6c',
      };

      const result = await controller.fork('ws-id-1', dto);

      expect(forkService.fork).toHaveBeenCalledWith('ws-id-1', dto);
      expect(result.id).toBe('ws-fork-1');
      expect(result).toBe(forkResult);
      // The fork endpoint never enqueues anything itself.
      expect(module.get(AiStepsService).enqueue).not.toHaveBeenCalled();
    });

    it('propagates a refused fork', async () => {
      const forkService = module.get(WorkspaceForkService);
      (forkService.fork as jest.Mock).mockRejectedValue(
        new NotFoundException('Workspace "missing" not found'),
      );

      await expect(
        controller.fork('missing', { analysisStrategy: AnalysisStrategy.b }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the comparison summary of the comparison service', async () => {
      const comparison = module.get(ComparisonSummaryService);
      (comparison.buildSummary as jest.Mock).mockResolvedValue(summary);

      await expect(controller.comparison('ws-id-1')).resolves.toBe(summary);
      expect(comparison.buildSummary).toHaveBeenCalledWith('ws-id-1');
    });

    it('exposes the strategy, context profile, fork link and policy fields in the detail', async () => {
      const policy = summary.members[0].analysisPolicy;
      const detail = {
        ...mockWorkspace,
        analysisStrategy: AnalysisStrategy.b,
        contextLayout: ContextLayout.boundary,
        contextSourceSet: ContextSourceSet.assessment,
        forkedFromWorkspaceId: 'ws-source',
        comparisonGroupId: 'ws-source',
        artifacts: [],
        manualNotes: [],
        manualNoteForcedClaims: [],
        manualNoteForcedClaimsUnreadable: [],
        sourcesChangedSinceAnalysis: false,
      };
      service.getWorkspaceDetail.mockResolvedValueOnce({
        ...detail,
        analysisPolicy: policy,
      } as any);
      service.getWorkspaceDetail.mockResolvedValueOnce(detail as any);

      const withPolicy = await controller.findById('ws-id-1');
      const withoutPolicy = await controller.findById('ws-id-1');

      expect(withPolicy).toMatchObject({
        analysisStrategy: AnalysisStrategy.b,
        contextLayout: ContextLayout.boundary,
        contextSourceSet: ContextSourceSet.assessment,
        forkedFromWorkspaceId: 'ws-source',
        comparisonGroupId: 'ws-source',
        analysisPolicy: policy,
      });
      expect(withoutPolicy).not.toHaveProperty('analysisPolicy');
      expect(withoutPolicy.analysisStrategy).toBe(AnalysisStrategy.b);
    });

    it('documents the fork and comparison endpoints', () => {
      const operationOf = (handler: unknown) =>
        Reflect.getMetadata('swagger/apiOperation', handler as object) as
          { summary?: string } | undefined;
      const responsesOf = (handler: unknown) =>
        Reflect.getMetadata('swagger/apiResponse', handler as object) as Record<
          string,
          { type: unknown }
        >;
      const { fork, comparison, findById } = WorkspacesController.prototype;

      expect(operationOf(fork)?.summary).toMatch(/Fork a workspace/);
      expect(operationOf(comparison)?.summary).toMatch(/comparison summary/);
      expect(responsesOf(fork)['201'].type).toBe(ForkWorkspaceResultDto);
      expect(responsesOf(comparison)['200'].type).toBe(ComparisonSummaryDto);

      // Every field of the request and of both responses is a documented property.
      expect(
        undocumentedPaths(
          {
            analysisStrategy: 'c',
            contextLayout: 'single',
            contextSourceSet: 'full',
            carryOverRequirements: true,
            requestKey: 'key',
          },
          ForkWorkspaceDto,
        ),
      ).toEqual([]);
      expect(
        undocumentedPaths(
          forkResult as unknown as Record<string, unknown>,
          ForkWorkspaceResultDto,
        ),
      ).toEqual([]);
      expect(
        undocumentedPaths(
          summary as unknown as Record<string, unknown>,
          ComparisonSummaryDto,
        ),
      ).toEqual([]);
      expect(responsesOf(findById)['200'].type).toBe(
        WorkspaceExperimentDetailDto,
      );
      expect(
        undocumentedPaths(
          {
            sourcesChangedSinceAnalysis: false,
            analysisStrategy: 'c',
            contextLayout: 'single',
            contextSourceSet: 'full',
            forkedFromWorkspaceId: null,
            comparisonGroupId: null,
            analysisPolicy: summary.members[0].analysisPolicy,
          },
          WorkspaceExperimentDetailDto,
        ),
      ).toEqual([]);
      // The walker itself reports an undocumented field, also inside a nested model.
      expect(
        undocumentedPaths({ notDocumented: 1 }, ForkWorkspaceResultDto),
      ).toEqual(['notDocumented']);
      expect(
        undocumentedPaths(
          { inputEquality: { model: { extra: true } } },
          ComparisonSummaryDto,
        ),
      ).toEqual(['inputEquality.model.extra']);
    });
  });
});
