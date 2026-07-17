import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus, PromptTemplate } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { FAKE_PROMPT3_JSON } from '../../ai/providers/fake.provider';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { Prompt3InputBuilderService } from './prompt3-input-builder.service';
import { Prompt3Service } from './prompt3.service';

const WORKSPACE_ID = 'ws-test-3';

const makeWorkspaceRecord = () => ({
  id: WORKSPACE_ID,
  workspaceSlug: '2026_01_01_FakeCompany_Backend',
  workspacePath: '2026_01_01_FakeCompany_Backend',
  storageRoot: '/storage',
  status: WorkspaceStatus.cv_draft_ready,
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

const makeTemplate = (): PromptTemplate => ({
  id: 'tpl-3',
  step: 'prompt_3',
  version: 1,
  content: 'Run pre-PDF check.',
  isActive: true,
  promptKey: 'prompt_3_pre_pdf_check',
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

describe('Prompt3Service', () => {
  let service: Prompt3Service;
  let prismaMock: jest.Mocked<Pick<PrismaService, 'applicationWorkspace'>>;
  let templatesMock: jest.Mocked<PromptTemplatesService>;
  let inputBuilderMock: jest.Mocked<Prompt3InputBuilderService>;
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
      buildPrompt3Input: jest.fn().mockResolvedValue({
        promptText: 'Run pre-PDF check.',
        inputContext: 'Company: Fake Company\nCV content...',
        sourceSnapshot: '{}',
      }),
    } as never;

    promptRunsMock = {
      create: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-3', 'pending')),
      markRunning: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-3', 'running')),
      complete: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-3', 'completed')),
      fail: jest.fn().mockResolvedValue(makePromptRunRecord('pr-3', 'failed')),
    } as never;

    aiRunsMock = {
      saveSuccess: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-3', 'completed')),
      saveFailed: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-fail-3', 'failed')),
    } as never;

    artifactStorageMock = {
      writeFile: jest.fn().mockResolvedValue({
        filePath: '/storage/ws/file.md',
        hash: 'hash789',
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
        text: JSON.stringify(FAKE_PROMPT3_JSON),
        parsedJson: FAKE_PROMPT3_JSON,
        usage: { inputTokens: 150, outputTokens: 80, totalTokens: 230 },
      }),
      providerName: 'fake',
      modelName: 'fake-model-v1',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Prompt3Service,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromptTemplatesService, useValue: templatesMock },
        { provide: Prompt3InputBuilderService, useValue: inputBuilderMock },
        { provide: PromptRunsService, useValue: promptRunsMock },
        { provide: AiRunsService, useValue: aiRunsMock },
        { provide: ArtifactStorageService, useValue: artifactStorageMock },
        { provide: ArtifactsService, useValue: artifactsMock },
        { provide: AI_PROVIDER, useValue: aiProviderMock },
      ],
    }).compile();

    service = module.get<Prompt3Service>(Prompt3Service);
  });

  describe('runPrePdfCheck — success path', () => {
    it('returns success: true with readiness from AI output', async () => {
      const result = await service.runPrePdfCheck(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.readiness).toBe(FAKE_PROMPT3_JSON.readiness);
    });

    it('saves both 03_pre_pdf_check.md and 03_pre_pdf_check.json', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '03_pre_pdf_check.md',
        expect.any(String),
      );
      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '03_pre_pdf_check.json',
        expect.any(String),
      );
    });

    it('creates a PromptRun with promptStep prompt_3 and correct template fields', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(promptRunsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          promptStep: 'prompt_3',
          templateId: 'tpl-3',
          templateVersion: 1,
        }),
      );
    });

    it('creates an AiRun via saveSuccess with token usage', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(aiRunsMock.saveSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'fake',
          model: 'fake-model-v1',
          inputTokens: 150,
          outputTokens: 80,
          totalTokens: 230,
        }),
      );
    });

    it('registers both artifacts with origin prompt_3', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(artifactsMock.register).toHaveBeenCalledTimes(2);
      const calls = artifactsMock.register.mock.calls;
      expect(calls.map((c) => c[0].canonicalFileName)).toEqual([
        '03_pre_pdf_check.md',
        '03_pre_pdf_check.json',
      ]);
      expect(calls.every((c) => c[0].origin === 'prompt_3')).toBe(true);
      expect(calls.map((c) => c[0].artifactType)).toEqual([
        'pre_pdf_check_md',
        'pre_pdf_check_json',
      ]);
    });

    it('does not change workspace.status', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });
  });

  describe('runPrePdfCheck — invalid JSON output', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockResolvedValue({
        text: 'This is not valid JSON at all.',
        usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
      });
    });

    it('returns success: false', async () => {
      const result = await service.runPrePdfCheck(WORKSPACE_ID);
      expect(result.success).toBe(false);
    });

    it('does not change workspace.status even on failure', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });

    it('saves the markdown artifact even when JSON is invalid', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '03_pre_pdf_check.md',
        expect.any(String),
      );
    });

    it('does not save the json artifact when JSON is invalid', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      const fileNames = artifactStorageMock.writeFile.mock.calls.map(
        (c) => c[1],
      );
      expect(fileNames).not.toContain('03_pre_pdf_check.json');
    });

    it('calls saveFailed not saveSuccess when JSON is invalid', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining('JSON validation failed'),
        }),
      );
      expect(aiRunsMock.saveSuccess).not.toHaveBeenCalled();
    });
  });

  describe('runPrePdfCheck — AI provider failure', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockRejectedValue(new Error('Provider timeout'));
    });

    it('returns success: false with provider error message', async () => {
      const result = await service.runPrePdfCheck(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.validationError).toContain('Provider timeout');
    });

    it('saves a failed AiRun record', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 'Provider timeout' }),
      );
    });

    it('does not change workspace.status', async () => {
      await service.runPrePdfCheck(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });
  });

  describe('runPrePdfCheck — workspace not found', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      (
        prismaMock.applicationWorkspace.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.runPrePdfCheck(WORKSPACE_ID)).rejects.toThrow(
        /not found/i,
      );
    });
  });

  describe('runPrePdfCheck — missing template', () => {
    it('throws when no active Prompt 3 template exists', async () => {
      templatesMock.findActive.mockResolvedValue(null);

      await expect(service.runPrePdfCheck(WORKSPACE_ID)).rejects.toThrow(
        /No active Prompt 3 template/,
      );
    });
  });
});
