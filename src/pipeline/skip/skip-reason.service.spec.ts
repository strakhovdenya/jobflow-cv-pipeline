import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VacancyDecision, WorkspaceStatus } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { FAKE_SKIP_REASON_JSON } from '../../ai/providers/fake.provider';
import { SkipReasonService } from './skip-reason.service';

const WORKSPACE_ID = 'ws-skip-1';
const PROMPT_RUN_ID = 'pr-skip-1';
const AI_RUN_ID = 'air-skip-1';
const TEMPLATE_ID = 'tpl-skip-1';

const makeWorkspace = (
  status: WorkspaceStatus = WorkspaceStatus.paused_after_analysis,
  decision: VacancyDecision = VacancyDecision.skip,
) => ({
  id: WORKSPACE_ID,
  status,
  currentDecision: decision,
  storageRoot: '/storage',
  workspacePath: 'applications/test_workspace',
  company: { companySlug: 'Fake_Company' },
  jobVacancy: { roleSlug: 'Backend_Developer' },
});

const makeTemplate = () => ({
  id: TEMPLATE_ID,
  version: 1,
  content: 'skip reason prompt',
});

const makePromptRun = () => ({ id: PROMPT_RUN_ID });
const makeAiRun = () => ({ id: AI_RUN_ID });

describe('SkipReasonService', () => {
  let service: SkipReasonService;

  let prismaMock: { applicationWorkspace: { findUnique: jest.Mock; update: jest.Mock } };
  let templatesMock: { findActive: jest.Mock };
  let promptRunsMock: { create: jest.Mock; markRunning: jest.Mock; complete: jest.Mock; fail: jest.Mock };
  let aiRunsMock: { saveSuccess: jest.Mock; saveFailed: jest.Mock };
  let storageMock: { writeFile: jest.Mock };
  let artifactsMock: { register: jest.Mock };
  let aiProviderMock: { providerName: string; modelName: string; complete: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    templatesMock = { findActive: jest.fn() };
    promptRunsMock = {
      create: jest.fn().mockResolvedValue(makePromptRun()),
      markRunning: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };
    aiRunsMock = {
      saveSuccess: jest.fn().mockResolvedValue(makeAiRun()),
      saveFailed: jest.fn().mockResolvedValue(makeAiRun()),
    };
    storageMock = {
      writeFile: jest.fn().mockResolvedValue({ filePath: '/storage/file', hash: 'abc123' }),
    };
    artifactsMock = { register: jest.fn().mockResolvedValue({ id: 'art-1' }) };
    aiProviderMock = {
      providerName: 'fake',
      modelName: 'fake-model-v1',
      complete: jest.fn().mockResolvedValue({
        text: JSON.stringify(FAKE_SKIP_REASON_JSON),
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkipReasonService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromptTemplatesService, useValue: templatesMock },
        { provide: PromptRunsService, useValue: promptRunsMock },
        { provide: AiRunsService, useValue: aiRunsMock },
        { provide: ArtifactStorageService, useValue: storageMock },
        { provide: ArtifactsService, useValue: artifactsMock },
        { provide: AI_PROVIDER, useValue: aiProviderMock },
      ],
    }).compile();

    service = module.get<SkipReasonService>(SkipReasonService);
  });

  describe('confirmSkip — success paths', () => {
    it('creates artifacts and sets status=skipped from paused_after_analysis', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      prismaMock.applicationWorkspace.update.mockResolvedValue({});

      const result = await service.confirmSkip(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.skipped);
      expect(storageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_skip_reason.md',
        expect.any(String),
      );
      expect(storageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_skip_reason.json',
        expect.any(String),
      );
      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: WorkspaceStatus.skipped, isSkipped: true }),
        }),
      );
    });

    it('creates artifacts and sets status=skipped from analysis_ready (retry path)', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.analysis_ready),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      prismaMock.applicationWorkspace.update.mockResolvedValue({});

      const result = await service.confirmSkip(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.skipped);
    });
  });

  describe('confirmSkip — precondition errors', () => {
    it('throws BadRequestException when status is not a valid precondition', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.source_saved),
      );

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when currentDecision is not skip', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis, VacancyDecision.apply),
      );

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmSkip — AI failure', () => {
    it('saves markdown, sets status=analysis_ready, returns error when JSON is invalid', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      aiProviderMock.complete.mockResolvedValue({
        text: '{ invalid json }',
        usage: {},
      });
      prismaMock.applicationWorkspace.update.mockResolvedValue({});

      const result = await service.confirmSkip(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.analysis_ready);
      expect(result.validationError).toBeDefined();
      expect(storageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_skip_reason.md',
        expect.any(String),
      );
      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: WorkspaceStatus.analysis_ready }),
        }),
      );
    });
  });

  describe('buildDownloadFileName', () => {
    it('follows SKIP_<company_slug>_<role_slug>_reason_RU.md pattern', () => {
      expect(service.buildDownloadFileName('Broadvoice', 'Full_Stack_Engineer')).toBe(
        'SKIP_Broadvoice_Full_Stack_Engineer_reason_RU.md',
      );
    });
  });
});
