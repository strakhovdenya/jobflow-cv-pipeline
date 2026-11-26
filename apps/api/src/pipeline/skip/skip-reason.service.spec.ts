import {
  LEGACY_ARTIFACTS,
  LEGACY_MANUAL_NOTES,
  LEGACY_WORKSPACE,
  activeTemplate,
  createWorkspaceStorage,
  fingerprintModelInput,
} from '../../../test/legacy-input-reference.helper';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VacancyDecision, WorkspaceStatus } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { WorkspaceStatusService } from '../../workspaces/workspace-status.service';
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
  company: {
    companySlug: 'Fake_Company',
    nameOriginal: 'Fake Company Inc.',
  },
  jobVacancy: {
    roleSlug: 'Backend_Developer',
    roleTitleOriginal: 'Backend Developer',
  },
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

  let prismaMock: {
    applicationWorkspace: { findUnique: jest.Mock };
    manualNote: { findMany: jest.Mock };
    manualNoteApplication: { createMany: jest.Mock };
  };
  let workspaceStatusMock: { transition: jest.Mock };
  let templatesMock: { findActive: jest.Mock };
  let promptRunsMock: {
    create: jest.Mock;
    markRunning: jest.Mock;
    complete: jest.Mock;
    fail: jest.Mock;
    failSafely: jest.Mock;
  };
  let aiRunsMock: { saveSuccess: jest.Mock; saveFailed: jest.Mock };
  let storageMock: { writeFile: jest.Mock; readFile: jest.Mock };
  let artifactsMock: { register: jest.Mock };
  let aiProviderMock: {
    providerName: string;
    modelName: string;
    complete: jest.Mock;
  };

  beforeEach(async () => {
    workspaceStatusMock = { transition: jest.fn().mockResolvedValue({}) };
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
      },
      manualNote: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      manualNoteApplication: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    templatesMock = { findActive: jest.fn() };
    promptRunsMock = {
      create: jest.fn().mockResolvedValue(makePromptRun()),
      markRunning: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
      failSafely: jest.fn().mockResolvedValue(undefined),
    };
    aiRunsMock = {
      saveSuccess: jest.fn().mockResolvedValue(makeAiRun()),
      saveFailed: jest.fn().mockResolvedValue(makeAiRun()),
    };
    storageMock = {
      writeFile: jest
        .fn()
        .mockResolvedValue({ filePath: '/storage/file', hash: 'abc123' }),
      readFile: jest.fn().mockResolvedValue(
        JSON.stringify({
          score: 42,
          decision: 'skip',
          company: { name_original: 'Fake Company Inc.' },
        }),
      ),
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
        { provide: WorkspaceStatusService, useValue: workspaceStatusMock },
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

      const result = await service.confirmSkip(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.skipped);

      expect(aiProviderMock.complete).toHaveBeenCalledTimes(1);
      const [, inputContext] = aiProviderMock.complete.mock.calls[0] as [
        string,
        string,
      ];
      expect(inputContext).not.toBe('');
      expect(inputContext).toContain('Fake Company Inc.');
      expect(inputContext).toContain('Backend Developer');
      expect(inputContext).toContain('"score":42');
      expect(inputContext).toContain('"decision":"skip"');

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
      expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        WorkspaceStatus.skipped,
        { data: { isSkipped: true } },
      );
      expect(artifactsMock.register).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactType: 'skip_reason_md',
          downloadFileName: 'SKIP_Fake_Company_Backend_Developer_reason_RU.md',
        }),
      );
      expect(artifactsMock.register).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactType: 'skip_reason_json',
          downloadFileName:
            'SKIP_Fake_Company_Backend_Developer_reason_RU.json',
        }),
      );
    });

    it('includes active manual notes in inputContext when present', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(
          WorkspaceStatus.paused_after_analysis,
          VacancyDecision.skip,
        ),
      );
      prismaMock.manualNote.findMany.mockResolvedValue([
        { id: 'note-1', text: 'Recruiter mentioned relocation is mandatory.' },
      ]);
      templatesMock.findActive.mockResolvedValue(makeTemplate());

      await service.confirmSkip(WORKSPACE_ID);

      const [, inputContext] = aiProviderMock.complete.mock.calls[0] as [
        string,
        string,
      ];
      expect(inputContext).toContain('=== MANUAL NOTE ===');
      expect(inputContext).toContain(
        'Recruiter mentioned relocation is mandatory.',
      );
      expect(prismaMock.manualNoteApplication.createMany).toHaveBeenCalledWith({
        data: [{ manualNoteId: 'note-1', promptRunId: PROMPT_RUN_ID }],
      });
    });

    it('creates artifacts and sets status=skipped from analysis_ready (retry path)', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.analysis_ready),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());

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

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when currentDecision is not skip', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(
          WorkspaceStatus.paused_after_analysis,
          VacancyDecision.apply,
        ),
      );

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws InternalServerErrorException when no active skip_reason template exists', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(null);

      const error = await service
        .confirmSkip(WORKSPACE_ID)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as Error).message).toMatch(
        /No active skip_reason template/,
      );
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirmSkip — input context build failure', () => {
    it('sets status=analysis_ready and returns error when 01_vacancy_analysis.json cannot be read', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      storageMock.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await service.confirmSkip(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.analysis_ready);
      expect(result.validationError).toContain('Failed to build input context');
      expect(aiProviderMock.complete).not.toHaveBeenCalled();
      expect(promptRunsMock.fail).toHaveBeenCalledWith(
        PROMPT_RUN_ID,
        AI_RUN_ID,
      );
      expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        WorkspaceStatus.analysis_ready,
      );
    });

    it('does not record a ManualNoteApplication when input context building fails (note text never reached the run)', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      prismaMock.manualNote.findMany.mockResolvedValue([
        { id: 'note-1', text: 'Recruiter mentioned relocation is mandatory.' },
      ]);
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      storageMock.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      await service.confirmSkip(WORKSPACE_ID);

      expect(
        prismaMock.manualNoteApplication.createMany,
      ).not.toHaveBeenCalled();
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

      const result = await service.confirmSkip(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.analysis_ready);
      expect(result.validationError).toBeDefined();
      expect(storageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_skip_reason.md',
        expect.any(String),
      );
      expect(workspaceStatusMock.transition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        WorkspaceStatus.analysis_ready,
      );
    });

    it('saves failed AiRun before writing files when JSON is invalid', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      aiProviderMock.complete.mockResolvedValue({
        text: '{ invalid json }',
        usage: {},
      });

      await service.confirmSkip(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed.mock.invocationCallOrder[0]).toBeLessThan(
        storageMock.writeFile.mock.invocationCallOrder[0],
      );
      expect(promptRunsMock.fail).toHaveBeenCalledWith(
        PROMPT_RUN_ID,
        AI_RUN_ID,
      );
    });
  });

  describe('buildDownloadFileName', () => {
    it('defaults to SKIP_<company_slug>_<role_slug>_reason_RU.md pattern', () => {
      expect(
        service.buildDownloadFileName('Broadvoice', 'Full_Stack_Engineer'),
      ).toBe('SKIP_Broadvoice_Full_Stack_Engineer_reason_RU.md');
    });

    it('builds a .json-suffixed name when extension="json"', () => {
      expect(
        service.buildDownloadFileName(
          'Broadvoice',
          'Full_Stack_Engineer',
          'json',
        ),
      ).toBe('SKIP_Broadvoice_Full_Stack_Engineer_reason_RU.json');
    });
  });

  describe('confirmSkip — unexpected error after the PromptRun was created', () => {
    it('marks the PromptRun failed (so the step is not blocked) and rethrows the original error', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      storageMock.writeFile.mockRejectedValue(new Error('disk full'));

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(
        'disk full',
      );

      expect(promptRunsMock.failSafely).toHaveBeenCalledWith(
        PROMPT_RUN_ID,
        AI_RUN_ID,
      );
    });

    it('saves AiRun and links it to the failed run when artifact registration fails', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
        makeWorkspace(WorkspaceStatus.paused_after_analysis),
      );
      templatesMock.findActive.mockResolvedValue(makeTemplate());
      artifactsMock.register.mockRejectedValue(new Error('db down'));

      await expect(service.confirmSkip(WORKSPACE_ID)).rejects.toThrow(
        'db down',
      );

      expect(aiRunsMock.saveSuccess).toHaveBeenCalled();
      expect(aiRunsMock.saveSuccess.mock.invocationCallOrder[0]).toBeLessThan(
        storageMock.writeFile.mock.invocationCallOrder[0],
      );
      expect(aiRunsMock.saveSuccess.mock.invocationCallOrder[0]).toBeLessThan(
        artifactsMock.register.mock.invocationCallOrder[0],
      );
      expect(promptRunsMock.failSafely).toHaveBeenCalledWith(
        PROMPT_RUN_ID,
        AI_RUN_ID,
      );
    });
  });
});

// ADR-046 item 1 and its amendment of 2026-11-26: the template and the complete input context of
// a legacy workspace, recorded on the unchanged post-#709 code with the real active template. A
// change of either fingerprint is a change of the legacy skip-reason input.
const LEGACY_SKIP_REASON_INPUT = {
  templateVersion: 2,
  template: {
    sha256: '151d372a3dadb3cc8cab9fd64c587d70a073f2d577eff17bf581bf8849971263',
    length: 3315,
  },
  inputContext: {
    sha256: 'e7ac3dd75b52adb782eb40da9659e93b75cf137ffe801948c787be0a941e234c',
    length: 1434,
  },
};

describe('SkipReasonService — legacy invariance', () => {
  it('keeps the legacy skip-reason input byte-identical', async () => {
    const template = activeTemplate('skip_reason');
    const complete = jest.fn().mockResolvedValue({
      text: JSON.stringify(FAKE_SKIP_REASON_JSON),
    });
    const prisma = {
      applicationWorkspace: {
        findUnique: jest.fn().mockResolvedValue({
          id: LEGACY_WORKSPACE.id,
          status: WorkspaceStatus.paused_after_analysis,
          currentDecision: VacancyDecision.skip,
          storageRoot: LEGACY_WORKSPACE.storageRoot,
          workspacePath: LEGACY_WORKSPACE.workspacePath,
          company: {
            companySlug: LEGACY_WORKSPACE.companySlug,
            nameOriginal: LEGACY_WORKSPACE.companyNameOriginal,
          },
          jobVacancy: {
            roleSlug: LEGACY_WORKSPACE.roleSlug,
            roleTitleOriginal: LEGACY_WORKSPACE.roleTitleOriginal,
          },
        }),
      },
      manualNote: {
        findMany: jest.fn().mockResolvedValue(LEGACY_MANUAL_NOTES),
      },
      manualNoteApplication: { createMany: jest.fn().mockResolvedValue({}) },
    };
    const storage = {
      ...createWorkspaceStorage(LEGACY_ARTIFACTS),
      writeFile: jest
        .fn()
        .mockResolvedValue({ filePath: '/storage/file', hash: 'hash' }),
    };
    const service = new SkipReasonService(
      prisma as unknown as PrismaService,
      {
        findActive: jest.fn().mockResolvedValue({
          id: 'tpl-skip-reason',
          version: template.version,
          content: template.content,
        }),
      } as unknown as PromptTemplatesService,
      {
        create: jest.fn().mockResolvedValue({ id: 'pr-skip' }),
        markRunning: jest.fn(),
        complete: jest.fn(),
        fail: jest.fn(),
        failSafely: jest.fn(),
      } as unknown as PromptRunsService,
      {
        saveSuccess: jest.fn().mockResolvedValue({ id: 'air-skip' }),
        saveFailed: jest.fn().mockResolvedValue({ id: 'air-skip' }),
      } as unknown as AiRunsService,
      storage as unknown as ArtifactStorageService,
      {
        register: jest.fn().mockResolvedValue({ id: 'art-skip' }),
      } as unknown as ArtifactsService,
      {
        transition: jest.fn().mockResolvedValue({}),
      } as unknown as WorkspaceStatusService,
      { providerName: 'fake', modelName: 'fake-model-v1', complete },
    );

    await service.confirmSkip(LEGACY_WORKSPACE.id);

    expect(complete).toHaveBeenCalledTimes(1);
    const [promptText, inputContext] = complete.mock.calls[0] as [
      string,
      string,
    ];
    expect(promptText).toBe(template.content);
    expect(
      fingerprintModelInput(template.version, promptText, inputContext),
    ).toEqual(LEGACY_SKIP_REASON_INPUT);
  });
});
