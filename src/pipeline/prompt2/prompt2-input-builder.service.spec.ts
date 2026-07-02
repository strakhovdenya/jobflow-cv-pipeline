import { BadRequestException } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  Prompt2InputBuilderService,
  Prompt2WorkspaceContext,
} from './prompt2-input-builder.service';

function makeWorkspace(status: string): Prompt2WorkspaceContext {
  return {
    id: 'ws-1',
    status,
    companyNameOriginal: 'Acme Corp',
    companySlug: 'acme_corp',
    roleTitleOriginal: 'Backend Engineer',
    roleSlug: 'backend_engineer',
    workspacePath: '2024-01-01_acme_corp_backend_engineer',
    storageRoot: '/storage',
  };
}

function makeKnowledgeSources(): KnowledgeSource[] {
  return [
    {
      id: 'ks-1',
      filePath: '/cv/Master_CV_RU.md',
      sourceType: 'master_cv',
      contentHash: 'hash-ks-1',
      isActive: true,
      versionLabel: 'v1',
      importedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

describe('Prompt2InputBuilderService', () => {
  let service: Prompt2InputBuilderService;
  let artifactStorage: jest.Mocked<ArtifactStorageService>;
  let knowledgeSourcesMock: jest.Mocked<KnowledgeSourcesService>;
  let selectionMock: jest.Mocked<KnowledgeSourceSelectionService>;

  beforeEach(() => {
    artifactStorage = {
      readFile: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    knowledgeSourcesMock = {
      findActive: jest.fn().mockResolvedValue(makeKnowledgeSources()),
    } as never;

    selectionMock = {
      selectForStep: jest.fn().mockReturnValue(makeKnowledgeSources()),
    } as never;

    service = new Prompt2InputBuilderService(
      artifactStorage,
      knowledgeSourcesMock,
      selectionMock,
    );
  });

  describe('buildPrompt2Input', () => {
    it('calls selectForStep with prompt_2 and all active sources', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.reject(new Error('not found'));
      });

      const allActiveSources = makeKnowledgeSources();
      knowledgeSourcesMock.findActive.mockResolvedValue(allActiveSources);

      await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      expect(selectionMock.selectForStep).toHaveBeenCalledWith(
        'prompt_2',
        allActiveSources,
      );
    });

    it('returns full input for approved workspace (status=cv_generation_running)', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'Prompt 2 template content',
        3,
      );

      expect(result.promptText).toBe('Prompt 2 template content');
      expect(result.templateVersion).toBe(3);
      expect(result.inputContext).toContain('vacancy text');
      expect(result.inputContext).toContain('{"recommendation":"apply"}');
      expect(result.inputContext).toContain('Acme Corp');
      expect(result.inputContext).toContain('Master_CV_RU.md');
    });

    it('throws BadRequestException for non-approved workspace status', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'skipped',
        'cv_pdf_generated',
      ]) {
        await expect(
          service.buildPrompt2Input(makeWorkspace(status), 'template', 1),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFile).not.toHaveBeenCalled();
    });

    it('sourceSnapshot contains vacancySourceHash and knowledge source hashes', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('analysis content');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.vacancySourceHash).toBeDefined();
      expect(typeof snapshot.vacancySourceHash).toBe('string');
      expect(snapshot.vacancySourceHash).toHaveLength(64); // sha256 hex
      expect(snapshot.knowledgeSources).toHaveLength(1);
      expect(snapshot.knowledgeSources[0].contentHash).toBe('hash-ks-1');
      expect(snapshot.knowledgeSources[0].id).toBe('ks-1');
      expect(snapshot.knowledgeSources[0].versionLabel).toBe('v1');
    });

    it('falls back to 01_vacancy_analysis.md when .json is not found', async () => {
      selectionMock.selectForStep.mockReturnValue([]);
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.reject(new Error('ENOENT'));
        if (p.endsWith('01_vacancy_analysis.md'))
          return Promise.resolve('# Analysis markdown');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      expect(result.inputContext).toContain('# Analysis markdown');
    });

    it('throws BadRequestException when both analysis artifacts are missing', async () => {
      selectionMock.selectForStep.mockReturnValue([]);
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        return Promise.reject(new Error('ENOENT'));
      });

      await expect(
        service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
