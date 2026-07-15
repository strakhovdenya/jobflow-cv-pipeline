import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus, PromptTemplate } from '@prisma/client';
import { AI_PROVIDER } from '../../ai/ai-provider.interface';
import { FAKE_COVER_LETTER_JSON } from '../../ai/providers/fake.provider';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { CoverLetterDraftsService } from '../../cover-letters/cover-letter-drafts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { WorkspaceStatusService } from '../../workspaces/workspace-status.service';
import { CoverLetterInputBuilderService } from './cover-letter-input-builder.service';
import { CoverLetterService } from './cover-letter.service';

const WORKSPACE_ID = 'ws-test-cl';

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

const makeTemplate = (): PromptTemplate => ({
  id: 'tpl-cl',
  step: 'cover_letter',
  version: 1,
  content: 'Generate a cover letter.',
  isActive: true,
  promptKey: 'cover_letter_generation',
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

const makeCoverLetterDraftRecord = () => ({
  id: 'cld-1',
  workspaceId: WORKSPACE_ID,
  promptRunId: 'pr-cl',
  version: 1,
  status: 'draft_ready',
  letterType: 'cover_letter',
  summaryPreview: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CoverLetterService', () => {
  let service: CoverLetterService;
  let prismaMock: jest.Mocked<Pick<PrismaService, 'applicationWorkspace'>>;
  let templatesMock: jest.Mocked<PromptTemplatesService>;
  let inputBuilderMock: jest.Mocked<CoverLetterInputBuilderService>;
  let promptRunsMock: jest.Mocked<PromptRunsService>;
  let aiRunsMock: jest.Mocked<AiRunsService>;
  let artifactStorageMock: jest.Mocked<ArtifactStorageService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;
  let workspaceStatusMock: jest.Mocked<WorkspaceStatusService>;
  let coverLetterDraftsMock: jest.Mocked<CoverLetterDraftsService>;
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
      buildCoverLetterInput: jest.fn().mockResolvedValue({
        promptText: 'Generate a cover letter.',
        inputContext: 'Company: Fake Company\nVacancy...',
        sourceSnapshot: '{}',
      }),
    } as never;

    promptRunsMock = {
      create: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-cl', 'pending')),
      markRunning: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-cl', 'running')),
      complete: jest
        .fn()
        .mockResolvedValue(makePromptRunRecord('pr-cl', 'completed')),
      fail: jest.fn().mockResolvedValue(makePromptRunRecord('pr-cl', 'failed')),
    } as never;

    aiRunsMock = {
      saveSuccess: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-cl', 'completed')),
      saveFailed: jest
        .fn()
        .mockResolvedValue(makeAiRunRecord('air-fail-cl', 'failed')),
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

    workspaceStatusMock = {
      isValidTransition: jest.fn().mockReturnValue(true),
      assertValidTransition: jest.fn(),
    } as never;

    coverLetterDraftsMock = {
      create: jest.fn().mockResolvedValue(makeCoverLetterDraftRecord()),
    } as never;

    aiProviderMock = {
      complete: jest.fn().mockResolvedValue({
        text: JSON.stringify(FAKE_COVER_LETTER_JSON),
        parsedJson: FAKE_COVER_LETTER_JSON,
        usage: { inputTokens: 150, outputTokens: 80, totalTokens: 230 },
      }),
      providerName: 'fake',
      modelName: 'fake-model-v1',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverLetterService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PromptTemplatesService, useValue: templatesMock },
        {
          provide: CoverLetterInputBuilderService,
          useValue: inputBuilderMock,
        },
        { provide: PromptRunsService, useValue: promptRunsMock },
        { provide: AiRunsService, useValue: aiRunsMock },
        { provide: ArtifactStorageService, useValue: artifactStorageMock },
        { provide: ArtifactsService, useValue: artifactsMock },
        { provide: WorkspaceStatusService, useValue: workspaceStatusMock },
        {
          provide: CoverLetterDraftsService,
          useValue: coverLetterDraftsMock,
        },
        { provide: AI_PROVIDER, useValue: aiProviderMock },
      ],
    }).compile();

    service = module.get<CoverLetterService>(CoverLetterService);
  });

  describe('generateCoverLetter — success path', () => {
    it('returns success: true with cover_letter_generated status', async () => {
      const result = await service.generateCoverLetter(WORKSPACE_ID);

      expect(result.success).toBe(true);
      expect(result.workspaceStatus).toBe(
        WorkspaceStatus.cover_letter_generated,
      );
    });

    it('saves both cover_letter.md and cover_letter.json', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'cover_letter.md',
        expect.any(String),
      );
      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'cover_letter.json',
        expect.any(String),
      );
    });

    it('creates a PromptRun with promptStep cover_letter and correct template fields', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(promptRunsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          promptStep: 'cover_letter',
          templateId: 'tpl-cl',
          templateVersion: 1,
        }),
      );
    });

    it('creates an AiRun via saveSuccess with token usage', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

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

    it('registers both artifacts with origin cover_letter', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(artifactsMock.register).toHaveBeenCalledTimes(2);
      const calls = artifactsMock.register.mock.calls;
      expect(calls.map((c) => c[0].canonicalFileName)).toEqual([
        'cover_letter.md',
        'cover_letter.json',
      ]);
      expect(calls.every((c) => c[0].origin === 'cover_letter')).toBe(true);
      expect(calls.map((c) => c[0].artifactType)).toEqual([
        'cover_letter_md',
        'cover_letter_json',
      ]);
    });

    it('transitions workspace status to cover_letter_generated via WorkspaceStatusService', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(workspaceStatusMock.assertValidTransition).toHaveBeenCalledWith(
        WorkspaceStatus.cv_pdf_generated,
        WorkspaceStatus.cover_letter_generated,
      );
      expect(prismaMock.applicationWorkspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WORKSPACE_ID },
          data: expect.objectContaining({
            status: WorkspaceStatus.cover_letter_generated,
          }),
        }),
      );
    });

    it('creates a CoverLetterDraft linked to the promptRunId', async () => {
      const result = await service.generateCoverLetter(WORKSPACE_ID);

      expect(coverLetterDraftsMock.create).toHaveBeenCalledWith(
        WORKSPACE_ID,
        expect.objectContaining({
          letterType: 'cover_letter',
          promptRunId: 'pr-cl',
        }),
      );
      expect(result.coverLetterDraft).toBeDefined();
    });
  });

  describe('generateCoverLetter — invalid JSON output', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockResolvedValue({
        text: 'This is not valid JSON at all.',
        usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
      });
    });

    it('returns success: false with workspaceStatus unchanged (cv_pdf_generated)', async () => {
      const result = await service.generateCoverLetter(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.workspaceStatus).toBe(WorkspaceStatus.cv_pdf_generated);
    });

    it('does not update workspace.status or create a CoverLetterDraft', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
      expect(coverLetterDraftsMock.create).not.toHaveBeenCalled();
    });

    it('saves the markdown artifact even when JSON is invalid', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(artifactStorageMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'cover_letter.md',
        expect.any(String),
      );
    });

    it('does not save the json artifact when JSON is invalid', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      const fileNames = artifactStorageMock.writeFile.mock.calls.map(
        (c) => c[1],
      );
      expect(fileNames).not.toContain('cover_letter.json');
    });

    it('calls saveFailed not saveSuccess when JSON is invalid', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining('JSON validation failed'),
        }),
      );
      expect(aiRunsMock.saveSuccess).not.toHaveBeenCalled();
    });
  });

  describe('generateCoverLetter — AI provider failure', () => {
    beforeEach(() => {
      aiProviderMock.complete.mockRejectedValue(new Error('Provider timeout'));
    });

    it('returns success: false with provider error message and unchanged status', async () => {
      const result = await service.generateCoverLetter(WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.validationError).toContain('Provider timeout');
      expect(result.workspaceStatus).toBe(WorkspaceStatus.cv_pdf_generated);
    });

    it('saves a failed AiRun record', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(aiRunsMock.saveFailed).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: 'Provider timeout' }),
      );
    });

    it('does not update workspace.status', async () => {
      await service.generateCoverLetter(WORKSPACE_ID);

      expect(prismaMock.applicationWorkspace.update).not.toHaveBeenCalled();
    });
  });

  describe('generateCoverLetter — workspace not found', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      (
        prismaMock.applicationWorkspace.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.generateCoverLetter(WORKSPACE_ID)).rejects.toThrow(
        /not found/i,
      );
    });
  });

  describe('generateCoverLetter — missing template', () => {
    it('throws when no active cover letter template exists', async () => {
      templatesMock.findActive.mockResolvedValue(null);

      await expect(service.generateCoverLetter(WORKSPACE_ID)).rejects.toThrow(
        /No active cover letter template/,
      );
    });
  });
});
