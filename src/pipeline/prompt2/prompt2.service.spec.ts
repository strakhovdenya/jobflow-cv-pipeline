import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { FAKE_PROMPT2_JSON } from '../../ai/providers/fake.provider';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { EvidenceGuardService } from '../../evidence/evidence-guard.service';
import { EvidenceService } from '../../evidence/evidence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { Prompt2InputBuilderService } from './prompt2-input-builder.service';
import { Prompt2Service } from './prompt2.service';

const WORKSPACE_ID = 'ws-test-2';

const makeWorkspaceRecord = () => ({
  id: WORKSPACE_ID,
  workspaceSlug: '2026_01_01_FakeCompany_Backend',
  workspacePath: '2026_01_01_FakeCompany_Backend',
  storageRoot: '/storage',
  status: WorkspaceStatus.cv_generation_running,
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
  id: 'tpl-2',
  step: 'prompt_2',
  version: 1,
  content: 'Generate targeted CV content.',
  isActive: true,
  promptKey: 'prompt_2_targeted_cv_content',
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

describe('Prompt2Service', () => {
  let service: Prompt2Service;
  let prismaMock: jest.Mocked<Pick<PrismaService, 'applicationWorkspace'>>;
  let templatesMock: jest.Mocked<PromptTemplatesService>;
  let inputBuilderMock: jest.Mocked<Prompt2InputBuilderService>;
  let promptRunsMock: jest.Mocked<PromptRunsService>;
  let aiRunsMock: jest.Mocked<AiRunsService>;
  let artifactStorageMock: jest.Mocked<ArtifactStorageService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let evidenceGuardMock: jest.Mocked<Pick<EvidenceGuardService, 'checkOutput'>>;
  let evidenceServiceMock: jest.Mocked<Pick<EvidenceService, 'findAll'>>;
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
      buildPrompt2Input: jest.fn().mockResolvedValue({
        promptText: 'Generate targeted CV content.',
        templateVersion: 1,
        inputContext: 'Company: Fake Company\nVacancy text...',
        sourceSnapshot: '{}',
      }),
    } as never;

    promptRunsMock = {
      create: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-2', 'pending')),
      markRunning: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-2', 'running')),
      complete: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-2', 'completed')),
      fail: jest.fn().mockResolvedValue(makePromptRunRecord('pr-2', 'failed')),
    } as never;

    aiRunsMock = {
      saveSuccess: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-2', 'completed')),
      saveFailed: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-fail-2', 'failed')),
    } as never;

    artifactStorageMock = {
      writeFile: jest.fn().mockResolvedValue({
        filePath: '/storage/ws/file.md',
        hash: 'hash456',
      }),
    } as never;

    artifactsMock = {
      register: jest
        .fn()
        .mockResolvedValueOnce(makeArtifactRecord('art-md'))
        .mockResolvedValueOnce(makeArtifactRecord('art-json')),
    } as never;

    evidenceGuardMock = {
      checkOutput: jest.fn().mockReturnValue({
        critical_issues: [],
        warnings: [],
        needs_evidence: [],
      }),
    } as never;

    evidenceServiceMock = {
      findAll: jest.fn().mockResolvedValue([]),
    } as never;

    aiProviderMock = {
      complete: jest.fn().mockResolvedValue({
        text: JSON.stringify(FAKE_PROMPT2_JSON),
        parsedJson: FAKE_PROMPT2_JSON,
        usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
      }),
      providerName: 'fake',
      modelName: 'fake-model-v1',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Prompt2Service,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromptTemplatesService, useValue: templatesMock },
        { provide: Prompt2InputBuilderService, useValue: inputBuilderMock },
        { provide: PromptRunsService, useValue: promptRunsMock },
        { provide: AiRunsService, useValue: aiRunsMock },
        { provide: ArtifactStorageService, useValue: artifactStorageMock },
        { provide: ArtifactsService, useValue: artifactsMock },
        { provide: EvidenceGuardService, useValue: evidenceGuardMock },
        { provide: EvidenceService, useValue: evidenceServiceMock },
        { provide: AI_PROVIDER, useValue: aiProviderMock },
      ],
    }).compile();

    service = module.get<Prompt2Service>(Prompt2Service);
  });

  describe('generateCvContent — success path', () => {
    it('returns success: true with cv_draft_ready status', async () => {
      const result = await service.generateCvContent(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.cv_draft_ready);
    });

    it('saves both 02_targeted_cv_content.md and 02_targeted_cv_content.json', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '02_targeted_cv_content.md',
        expect.any(String),
      );
      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '02_targeted_cv_content.json',
        expect.any(String),
      );
    });

    it('creates a PromptRun with promptStep prompt_2 and correct template fields', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(promptRunsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          promptStep: 'prompt_2',
          templateId: 'tpl-2',
          templateVersion: 1,
        }),
      );
    });

    it('creates an AiRun via saveSuccess with token usage', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(aiRunsMock.saveSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'fake',
          model: 'fake-model-v1',
          inputTokens: 200,
          outputTokens: 100,
          totalTokens: 300,
        }),
      );
    });

    it('registers both artifacts in the database', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(artifactsMock.register).toHaveBeenCalledTimes(2);
      const fileNames = artifactsMock.register.mock.calls.map(
        (c) => c[0].canonicalFileName,
      );
      expect(fileNames).toContain('02_targeted_cv_content.md');
      expect(fileNames).toContain('02_targeted_cv_content.json');
    });

    it('transitions workspace status to cv_draft_ready', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WORKSPACE_ID },
          data: expect.objectContaining({
            status: WorkspaceStatus.cv_draft_ready,
          }),
        }),
      );
    });
  });

  describe('generateCvContent — invalid JSON output', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockResolvedValue({
        text: 'This is not valid JSON at all.',
        usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
      });
    });

    it('returns success: false', async () => {
      const result = await service.generateCvContent(WORKSPACE_ID);
      expect(result.success).toBe(false);
    });

    it('sets workspace status to failed', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: WorkspaceStatus.failed }),
        }),
      );
    });

    it('saves the markdown artifact even when JSON is invalid', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '02_targeted_cv_content.md',
        expect.any(String),
      );
    });

    it('does not save the json artifact when JSON is invalid', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      const fileNames = artifactStorageMock.writeFile.mock.calls.map(
        (c) => c[1],
      );
      expect(fileNames).not.toContain('02_targeted_cv_content.json');
    });

    it('calls saveFailed not saveSuccess when JSON is invalid', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining('JSON validation failed'),
        }),
      );
      expect(aiRunsMock.saveSuccess).not.toHaveBeenCalled();
    });
  });

  describe('generateCvContent — AI provider failure', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockRejectedValue(new Error('Provider timeout'));
    });

    it('returns success: false with provider error message', async () => {
      const result = await service.generateCvContent(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.validationError).toContain('Provider timeout');
    });

    it('saves a failed AiRun record', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 'Provider timeout' }),
      );
    });

    it('sets workspace status to failed', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: WorkspaceStatus.failed }),
        }),
      );
    });
  });

  describe('generateCvContent — workspace not found', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      (
        prismaMock.applicationWorkspace.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.generateCvContent(WORKSPACE_ID)).rejects.toThrow(
        /not found/i,
      );
    });
  });

  describe('generateCvContent — missing template', () => {
    it('throws when no active Prompt 2 template exists', async () => {
      templatesMock.findActive.mockResolvedValue(null);

      await expect(service.generateCvContent(WORKSPACE_ID)).rejects.toThrow(
        /No active Prompt 2 template/,
      );
    });
  });

  describe('generateCvContent — evidence guard integration', () => {
    it('calls evidenceService.findAll and evidenceGuard.checkOutput on successful JSON validation', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      expect(evidenceServiceMock.findAll).toHaveBeenCalledTimes(1);
      expect(evidenceGuardMock.checkOutput).toHaveBeenCalledTimes(1);
    });

    it('passes validated Prompt2Output to evidenceGuard.checkOutput', async () => {
      await service.generateCvContent(WORKSPACE_ID);

      const callArg = (evidenceGuardMock.checkOutput as jest.Mock).mock
        .calls[0][0];
      expect(callArg).toMatchObject({
        schema_version: '1.0',
        step: 'prompt_2_targeted_cv_content',
      });
    });

    it('writes json artifact with guard result in overclaiming_check, not passive AI output', async () => {
      (evidenceGuardMock.checkOutput as jest.Mock).mockReturnValue({
        critical_issues: [
          'Guard detected: Kubernetes production experience is not supported',
        ],
        warnings: [],
        needs_evidence: ['DynamoDB'],
      });

      await service.generateCvContent(WORKSPACE_ID);

      const jsonWriteCall = (
        artifactStorageMock.writeFile as jest.Mock
      ).mock.calls.find(
        (c: unknown[]) => c[1] === '02_targeted_cv_content.json',
      );
      expect(jsonWriteCall).toBeDefined();
      const writtenJson = JSON.parse(jsonWriteCall[2] as string) as {
        overclaiming_check: {
          critical_issues: string[];
          needs_evidence: string[];
        };
      };
      expect(writtenJson.overclaiming_check.critical_issues).toContain(
        'Guard detected: Kubernetes production experience is not supported',
      );
      expect(writtenJson.overclaiming_check.needs_evidence).toContain(
        'DynamoDB',
      );
    });

    it('does NOT call evidenceGuard when JSON validation fails', async () => {
      aiProviderMock.complete.mockResolvedValue({
        text: 'This is not valid JSON at all.',
        usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
      });

      await service.generateCvContent(WORKSPACE_ID);

      expect(evidenceGuardMock.checkOutput).not.toHaveBeenCalled();
    });
  });
});
