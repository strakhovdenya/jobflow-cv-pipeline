import { BadRequestException } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  Prompt3InputBuilderService,
  Prompt3WorkspaceContext,
} from './prompt3-input-builder.service';

function makeWorkspace(status: string): Prompt3WorkspaceContext {
  return {
    id: 'ws-1',
    status,
    companyNameOriginal: 'Acme Corp',
    roleTitleOriginal: 'Backend Engineer',
    workspacePath: '2024-01-01_acme_corp_backend_engineer',
    storageRoot: '/storage',
  };
}

function makeKnowledgeSource(
  sourceType: string,
  id = `ks-${sourceType}`,
): KnowledgeSource {
  return {
    id,
    sourceType,
    filePath: `/knowledge-sources/${sourceType}.md`,
    contentHash: `hash-${id}`,
    isActive: true,
    versionLabel: `v1-${id}`,
    importedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Prompt3InputBuilderService', () => {
  let service: Prompt3InputBuilderService;
  let artifactStorage: jest.Mocked<ArtifactStorageService>;
  let knowledgeSourcesService: jest.Mocked<KnowledgeSourcesService>;
  let selectionService: jest.Mocked<KnowledgeSourceSelectionService>;
  let knowledgeSourceContent: jest.Mocked<KnowledgeSourceContentService>;

  beforeEach(() => {
    artifactStorage = {
      readFile: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    knowledgeSourcesService = {
      findActive: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<KnowledgeSourcesService>;

    selectionService = {
      selectForStep: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<KnowledgeSourceSelectionService>;

    knowledgeSourceContent = {
      loadContent: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<KnowledgeSourceContentService>;

    service = new Prompt3InputBuilderService(
      artifactStorage,
      knowledgeSourcesService,
      selectionService,
      knowledgeSourceContent,
    );
  });

  describe('buildPrompt3Input', () => {
    it('throws BadRequestException for statuses other than pre_pdf_check_ready', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'cv_generation_running',
        'cv_draft_ready',
        'paused_after_cv_draft',
        'export_running',
        'cv_pdf_generated',
      ]) {
        await expect(
          service.buildPrompt3Input(makeWorkspace(status), 'template'),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFile).not.toHaveBeenCalled();
    });

    it('returns full input for status=pre_pdf_check_ready', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"decision":"apply"}');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'Prompt 3 template content',
      );

      expect(result.promptText).toBe('Prompt 3 template content');
      expect(result.inputContext).toContain('{"headline":"Backend Engineer"}');
      expect(result.inputContext).toContain('{"decision":"apply"}');
      expect(result.inputContext).toContain('Acme Corp');
    });

    it('throws BadRequestException when 02_targeted_cv_content.json is missing', async () => {
      artifactStorage.readFile.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.buildPrompt3Input(
          makeWorkspace('pre_pdf_check_ready'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to a placeholder when 01_vacancy_analysis.json is missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[No vacancy analysis artifact available]',
      );
    });

    it('sourceSnapshot references the CV content path', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'template',
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.cvContentPath).toContain('02_targeted_cv_content.json');
    });

    it('falls back to a placeholder when 00_vacancy_source.txt is missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[No raw vacancy source artifact available]',
      );
    });

    it('includes the raw vacancy source text when present', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('We are looking for a backend engineer.');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'template',
      );

      expect(result.inputContext).toContain(
        'We are looking for a backend engineer.',
      );
    });

    it('selects prompt_3 knowledge sources and inlines their content', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const techStackSource = makeKnowledgeSource('tech_stack');
      const careerCasesSource = makeKnowledgeSource('career_cases');
      knowledgeSourcesService.findActive.mockResolvedValue([
        techStackSource,
        careerCasesSource,
      ]);
      selectionService.selectForStep.mockReturnValue([
        techStackSource,
        careerCasesSource,
      ]);
      knowledgeSourceContent.loadContent.mockResolvedValue([
        {
          id: techStackSource.id,
          sourceType: 'tech_stack',
          filePath: techStackSource.filePath,
          versionLabel: techStackSource.versionLabel,
          contentAvailable: true,
          content: 'Node.js/TypeScript/Azure are core.',
        },
        {
          id: careerCasesSource.id,
          sourceType: 'career_cases',
          filePath: careerCasesSource.filePath,
          versionLabel: careerCasesSource.versionLabel,
          contentAvailable: true,
          content: 'Case study: backend migration project.',
        },
      ]);

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'template',
      );

      expect(selectionService.selectForStep).toHaveBeenCalledWith('prompt_3', [
        techStackSource,
        careerCasesSource,
      ]);
      expect(result.inputContext).toContain(
        'Node.js/TypeScript/Azure are core.',
      );
      expect(result.inputContext).toContain(
        'Case study: backend migration project.',
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.knowledgeSources).toHaveLength(2);
      expect(
        snapshot.knowledgeSources.map(
          (ks: { sourceType: string }) => ks.sourceType,
        ),
      ).toEqual(['tech_stack', 'career_cases']);
    });

    it('placeholders when no prompt_3 knowledge sources are active', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('pre_pdf_check_ready'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[No active knowledge sources available]',
      );
      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.knowledgeSources).toEqual([]);
    });
  });
});
