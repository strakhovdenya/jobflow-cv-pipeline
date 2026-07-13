import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { FAKE_PROMPT5_JSON } from '../../ai/providers/fake.provider';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { Prompt5InputBuilderService } from './prompt5-input-builder.service';
import { Prompt5Service } from './prompt5.service';

const WORKSPACE_ID = 'ws-test-5';

const makeWorkspaceRecord = () => ({
  id: WORKSPACE_ID,
  workspaceSlug: '2026_01_01_FakeCompany_Backend',
  workspacePath: '2026_01_01_FakeCompany_Backend',
  storageRoot: '/storage',
  status: WorkspaceStatus.cv_pdf_generated,
  company: {
    id: 'co-1',
    nameOriginal: 'Fake Company',
    companySlug: 'Fake_Company',
  },
  jobVacancy: {
    id: 'jv-1',
    roleTitleOriginal: 'Backend Developer',
    roleSlug: 'Backend_Developer',
  },
});

const makeTemplate = () => ({
  id: 'tpl-5',
  step: 'prompt_5',
  version: 1,
  content: 'Run final check.',
  isActive: true,
  promptKey: 'prompt_5_final_check',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeAiRunRecord = (id: string, status: string) => ({
  id,
  status,
  provider: 'fake',
  model: 'fake-model-v1',
});

const makePromptRunRecord = (id: string, status: string) => ({
  id,
  status,
  workspaceId: WORKSPACE_ID,
});

const makeArtifactRecord = (id: string) => ({
  id,
  workspaceId: WORKSPACE_ID,
});

describe('Prompt5Service', () => {
  let service: Prompt5Service;
  let prismaMock: jest.Mocked<Pick<PrismaService, 'applicationWorkspace'>>;
  let templatesMock: jest.Mocked<PromptTemplatesService>;
  let inputBuilderMock: jest.Mocked<Prompt5InputBuilderService>;
  let promptRunsMock: jest.Mocked<PromptRunsService>;
  let aiRunsMock: jest.Mocked<AiRunsService>;
  let artifactStorageMock: jest.Mocked<ArtifactStorageService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let aiProviderMock: {
    complete: jest.Mock;
    providerName: string;
    modelName: string;
  };

  beforeEach(async () => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn().mockResolvedValue(makeWorkspaceRecord()),
        update: jest.fn().mockResolvedValue({}),
      } as never,
    };

    templatesMock = {
      findActive: jest.fn().mockResolvedValue(makeTemplate()),
    } as never;

    inputBuilderMock = {
      buildPrompt5Input: jest.fn().mockResolvedValue({
        promptText: 'Run final check.',
        inputContext: 'Company: Fake Company\nExported CV...',
        sourceSnapshot: '{}',
      }),
    } as never;

    promptRunsMock = {
      create: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-5', 'pending')),
      markRunning: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-5', 'running')),
      complete: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-5', 'completed')),
      fail: jest.fn().mockResolvedValue(makePromptRunRecord('pr-5', 'failed')),
    } as never;

    aiRunsMock = {
      saveSuccess: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-5', 'completed')),
      saveFailed: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-fail-5', 'failed')),
    } as never;

    artifactStorageMock = {
      writeFile: jest.fn().mockResolvedValue({
        filePath: '/storage/ws/file.md',
        hash: 'hashabc',
      }),
    } as never;

    artifactsMock = {
      register: jest
        .fn()
        .mockResolvedValueOnce(makeArtifactRecord('art-md'))
        .mockResolvedValueOnce(makeArtifactRecord('art-json')),
    } as never;

    aiProviderMock = {
      complete: jest.fn().mockResolvedValue({
        text: JSON.stringify(FAKE_PROMPT5_JSON),
        parsedJson: FAKE_PROMPT5_JSON,
        usage: { inputTokens: 180, outputTokens: 90, totalTokens: 270 },
      }),
      providerName: 'fake',
      modelName: 'fake-model-v1',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Prompt5Service,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromptTemplatesService, useValue: templatesMock },
        { provide: Prompt5InputBuilderService, useValue: inputBuilderMock },
        { provide: PromptRunsService, useValue: promptRunsMock },
        { provide: AiRunsService, useValue: aiRunsMock },
        { provide: ArtifactStorageService, useValue: artifactStorageMock },
        { provide: ArtifactsService, useValue: artifactsMock },
        { provide: AI_PROVIDER, useValue: aiProviderMock },
      ],
    }).compile();

    service = module.get<Prompt5Service>(Prompt5Service);
  });

  describe('runFinalCheck — success path', () => {
    it('returns success: true with finalDecision and final_check_ready status', async () => {
      const result = await service.runFinalCheck(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.finalDecision).toBe(FAKE_PROMPT5_JSON.final_decision);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.final_check_ready);
    });

    it('saves both 05_final_check.md and 05_final_check.json', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '05_final_check.md',
        expect.any(String),
      );
      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '05_final_check.json',
        expect.any(String),
      );
    });

    it('creates a PromptRun with promptStep prompt_5 and correct template fields', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(promptRunsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          promptStep: 'prompt_5',
          templateId: 'tpl-5',
          templateVersion: 1,
        }),
      );
    });

    it('creates an AiRun via saveSuccess with token usage', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(aiRunsMock.saveSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'fake',
          model: 'fake-model-v1',
          inputTokens: 180,
          outputTokens: 90,
          totalTokens: 270,
        }),
      );
    });

    it('registers both artifacts with origin prompt_5', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(artifactsMock.register).toHaveBeenCalledTimes(2);
      const calls = artifactsMock.register.mock.calls;
      expect(calls.map((c) => c[0].canonicalFileName)).toEqual([
        '05_final_check.md',
        '05_final_check.json',
      ]);
      expect(calls.every((c) => c[0].origin === 'prompt_5')).toBe(true);
      expect(calls.map((c) => c[0].artifactType)).toEqual([
        'final_check_md',
        'final_check_json',
      ]);
    });

    it('transitions workspace status to final_check_ready', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WORKSPACE_ID },
          data: expect.objectContaining({
            status: WorkspaceStatus.final_check_ready,
          }),
        }),
      );
    });
  });

  describe('runFinalCheck — invalid JSON output', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockResolvedValue({
        text: 'This is not valid JSON at all.',
        usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
      });
    });

    it('returns success: false with workspaceStatus unchanged (cv_pdf_generated)', async () => {
      const result = await service.runFinalCheck(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.cv_pdf_generated);
    });

    it('does not update workspace.status', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });

    it('saves the markdown artifact even when JSON is invalid', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '05_final_check.md',
        expect.any(String),
      );
    });

    it('does not save the json artifact when JSON is invalid', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      const fileNames = artifactStorageMock.writeFile.mock.calls.map(
        (c) => c[1],
      );
      expect(fileNames).not.toContain('05_final_check.json');
    });

    it('calls saveFailed not saveSuccess when JSON is invalid', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining('JSON validation failed'),
        }),
      );
      expect(aiRunsMock.saveSuccess).not.toHaveBeenCalled();
    });
  });

  describe('runFinalCheck — AI provider failure', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockRejectedValue(new Error('Provider timeout'));
    });

    it('returns success: false with provider error message and unchanged status', async () => {
      const result = await service.runFinalCheck(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.validationError).toContain('Provider timeout');
      expect(result.workspaceStatus).toBe(WorkspaceStatus.cv_pdf_generated);
    });

    it('saves a failed AiRun record', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 'Provider timeout' }),
      );
    });

    it('does not update workspace.status', async () => {
      await service.runFinalCheck(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });
  });

  describe('runFinalCheck — workspace not found', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      (
        prismaMock.applicationWorkspace.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.runFinalCheck(WORKSPACE_ID)).rejects.toThrow(
        /not found/i,
      );
    });
  });

  describe('runFinalCheck — missing template', () => {
    it('throws when no active Prompt 5 template exists', async () => {
      templatesMock.findActive.mockResolvedValue(null);

      await expect(service.runFinalCheck(WORKSPACE_ID)).rejects.toThrow(
        /No active Prompt 5 template/,
      );
    });
  });
});
