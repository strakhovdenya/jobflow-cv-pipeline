import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus, VacancyDecision } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { FAKE_PROMPT1_JSON } from '../../ai/providers/fake.provider';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { PromptInputBuilderService } from '../prompt-input-builder.service';
import { Prompt1Service } from './prompt1.service';

const WORKSPACE_ID = 'ws-test-1';

const makeWorkspaceRecord = () => ({
  id: WORKSPACE_ID,
  workspaceSlug: '2026_01_01_FakeCompany_Backend',
  workspacePath: '2026_01_01_FakeCompany_Backend',
  storageRoot: '/storage',
  status: WorkspaceStatus.source_saved,
  company: { id: 'co-1', nameOriginal: 'Fake Company', companySlug: 'Fake_Company' },
  jobVacancy: { id: 'jv-1', roleTitleOriginal: 'Backend Developer', roleSlug: 'Backend_Developer' },
});

const makeTemplate = () => ({
  id: 'tpl-1',
  step: 'prompt_1',
  version: 1,
  content: 'Analyze this vacancy.',
  isActive: true,
  promptKey: 'prompt_1_vacancy_analysis',
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

describe('Prompt1Service', () => {
  let service: Prompt1Service;
  let prismaMock: jest.Mocked<Pick<PrismaService, 'applicationWorkspace'>>;
  let templatesMock: jest.Mocked<PromptTemplatesService>;
  let sourcesMock: jest.Mocked<KnowledgeSourcesService>;
  let inputBuilderMock: jest.Mocked<PromptInputBuilderService>;
  let promptRunsMock: jest.Mocked<PromptRunsService>;
  let aiRunsMock: jest.Mocked<AiRunsService>;
  let artifactStorageMock: jest.Mocked<ArtifactStorageService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let aiProviderMock: { complete: jest.Mock; providerName: string; modelName: string };

  beforeEach(async () => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn().mockResolvedValue(makeWorkspaceRecord()),
        update: jest.fn().mockResolvedValue({}),
      } as never,
    };

    templatesMock = { findActive: jest.fn().mockResolvedValue(makeTemplate()) } as never;
    sourcesMock = { findActive: jest.fn().mockResolvedValue([]) } as never;

    inputBuilderMock = {
      buildPrompt1Input: jest.fn().mockResolvedValue({
        promptText: 'Analyze this vacancy.',
        inputContext: 'Company: Fake Company\nVacancy text...',
        sourceSnapshot: '[]',
      }),
    } as never;

    promptRunsMock = {
      create: jest.fn().mockResolvedValue(makePromptRunRecord('pr-1', 'pending')),
      markRunning: jest.fn().mockResolvedValue(makePromptRunRecord('pr-1', 'running')),
      complete: jest.fn().mockResolvedValue(makePromptRunRecord('pr-1', 'completed')),
      fail: jest.fn().mockResolvedValue(makePromptRunRecord('pr-1', 'failed')),
    } as never;

    aiRunsMock = {
      saveSuccess: jest.fn().mockResolvedValue(makeAiRunRecord('air-1', 'completed')),
      saveFailed: jest.fn().mockResolvedValue(makeAiRunRecord('air-fail-1', 'failed')),
    } as never;

    artifactStorageMock = {
      writeFile: jest.fn().mockResolvedValue({ filePath: '/storage/ws/file.md', hash: 'hash123' }),
    } as never;

    artifactsMock = {
      register: jest
        .fn()
        .mockResolvedValueOnce(makeArtifactRecord('art-1'))
        .mockResolvedValueOnce(makeArtifactRecord('art-2')),
    } as never;

    aiProviderMock = {
      complete: jest.fn().mockResolvedValue({
        text: JSON.stringify(FAKE_PROMPT1_JSON),
        parsedJson: FAKE_PROMPT1_JSON,
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      }),
      providerName: 'fake',
      modelName: 'fake-model-v1',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Prompt1Service,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromptTemplatesService, useValue: templatesMock },
        { provide: KnowledgeSourcesService, useValue: sourcesMock },
        { provide: PromptInputBuilderService, useValue: inputBuilderMock },
        { provide: PromptRunsService, useValue: promptRunsMock },
        { provide: AiRunsService, useValue: aiRunsMock },
        { provide: ArtifactStorageService, useValue: artifactStorageMock },
        { provide: ArtifactsService, useValue: artifactsMock },
        { provide: AI_PROVIDER, useValue: aiProviderMock },
      ],
    }).compile();

    service = module.get<Prompt1Service>(Prompt1Service);
  });

  describe('runAnalysis — success path', () => {
    it('returns success with paused_after_analysis status', async () => {
      const result = await service.runAnalysis(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.paused_after_analysis);
    });

    it('stores the decision from the AI output', async () => {
      const result = await service.runAnalysis(WORKSPACE_ID);

      expect(result.decision).toBe(VacancyDecision.apply);
    });

    it('stores the score from the AI output', async () => {
      const result = await service.runAnalysis(WORKSPACE_ID);

      expect(result.score).toBe(75);
    });

    it('creates a PromptRun record linked to the workspace', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(promptRunsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          promptStep: 'prompt_1',
          templateId: 'tpl-1',
          templateVersion: 1,
        }),
      );
    });

    it('creates an AiRun record with status completed', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(aiRunsMock.saveSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'fake', model: 'fake-model-v1' }),
      );
    });

    it('saves both md and json artifacts', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_vacancy_analysis.md',
        expect.any(String),
      );
      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_vacancy_analysis.json',
        expect.any(String),
      );
    });

    it('registers both artifacts in the database', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(artifactsMock.register).toHaveBeenCalledTimes(2);
      const calls = artifactsMock.register.mock.calls.map((c) => c[0].canonicalFileName);
      expect(calls).toContain('01_vacancy_analysis.md');
      expect(calls).toContain('01_vacancy_analysis.json');
    });

    it('completes the PromptRun with aiRunId', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(promptRunsMock.complete).toHaveBeenCalledWith(
        'pr-1',
        expect.objectContaining({ aiRunId: 'air-1' }),
      );
    });

    it('transitions workspace status to paused_after_analysis with decision and score', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WORKSPACE_ID },
          data: expect.objectContaining({
            status: WorkspaceStatus.paused_after_analysis,
            currentDecision: VacancyDecision.apply,
            score: 75,
          }),
        }),
      );
    });
  });

  describe('runAnalysis — invalid JSON output', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockResolvedValue({
        text: 'This is not valid JSON at all.',
        usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
      });
    });

    it('returns success: false', async () => {
      const result = await service.runAnalysis(WORKSPACE_ID);

      expect(result.success).toBe(false);
    });

    it('includes a validationError message', async () => {
      const result = await service.runAnalysis(WORKSPACE_ID);

      expect(result.validationError).toBeDefined();
      expect(typeof result.validationError).toBe('string');
    });

    it('sets workspace status to failed', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: WorkspaceStatus.failed }),
        }),
      );
    });

    it('marks the PromptRun as failed', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(promptRunsMock.fail).toHaveBeenCalledWith('pr-1');
    });

    it('saves a failed AiRun record (not completed) when JSON is invalid', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: expect.stringContaining('JSON validation failed') }),
      );
      expect(aiRunsMock.saveSuccess).not.toHaveBeenCalled();
    });

    it('still saves the markdown artifact even when JSON is invalid', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '01_vacancy_analysis.md',
        expect.any(String),
      );
    });

    it('does not crash the endpoint — returns error result instead of throwing', async () => {
      await expect(service.runAnalysis(WORKSPACE_ID)).resolves.toMatchObject({
        success: false,
      });
    });
  });

  describe('runAnalysis — AI provider failure', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockRejectedValue(new Error('Provider timeout'));
    });

    it('returns success: false with provider error message', async () => {
      const result = await service.runAnalysis(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.validationError).toContain('Provider timeout');
    });

    it('saves a failed AiRun record', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 'Provider timeout' }),
      );
    });

    it('sets workspace status to failed', async () => {
      await service.runAnalysis(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: WorkspaceStatus.failed }),
        }),
      );
    });
  });

  describe('runAnalysis — missing template', () => {
    it('throws when no active Prompt 1 template exists', async () => {
      templatesMock.findActive.mockResolvedValue(null);

      await expect(service.runAnalysis(WORKSPACE_ID)).rejects.toThrow(/No active Prompt 1 template/);
    });
  });

  describe('runAnalysis — workspace not found', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      (prismaMock.applicationWorkspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.runAnalysis(WORKSPACE_ID)).rejects.toThrow(/not found/i);
    });
  });
});
