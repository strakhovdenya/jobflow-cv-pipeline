import { BadRequestException } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  CoverLetterInputBuilderService,
  CoverLetterWorkspaceContext,
} from './cover-letter-input-builder.service';

function makeWorkspace(status: string): CoverLetterWorkspaceContext {
  return {
    id: 'ws-1',
    status,
    companyNameOriginal: 'Acme Corp',
    roleTitleOriginal: 'Backend Engineer',
    workspacePath: '2024-01-01_acme_corp_backend_engineer',
    storageRoot: '/storage',
  };
}

function makeKnowledgeSources(): KnowledgeSource[] {
  return [
    {
      id: 'ks-1',
      filePath: '/knowledge-sources/Master_Profile_Summary.md',
      sourceType: 'profile_summary',
      contentHash: 'hash-ks-1',
      isActive: true,
      versionLabel: 'v1',
      importedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

describe('CoverLetterInputBuilderService', () => {
  let service: CoverLetterInputBuilderService;
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

    service = new CoverLetterInputBuilderService(
      artifactStorage,
      knowledgeSourcesMock,
      selectionMock,
    );
  });

  describe('buildCoverLetterInput', () => {
    it('throws BadRequestException for statuses other than cv_pdf_generated/final_check_ready', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'cv_generation_running',
        'cv_draft_ready',
        'export_running',
      ]) {
        await expect(
          service.buildCoverLetterInput(makeWorkspace(status), 'template'),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFile).not.toHaveBeenCalled();
    });

    it('allows status=cv_pdf_generated', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('not found'));
      });

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).resolves.toBeDefined();
    });

    it('allows status=final_check_ready', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('not found'));
      });

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('final_check_ready'),
          'template',
        ),
      ).resolves.toBeDefined();
    });

    it('calls selectForStep with cover_letter and all active sources', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('not found'));
      });

      const allActiveSources = makeKnowledgeSources();
      knowledgeSourcesMock.findActive.mockResolvedValue(allActiveSources);

      await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(selectionMock.selectForStep).toHaveBeenCalledWith(
        'cover_letter',
        allActiveSources,
      );
    });

    it('returns full input context for status=cv_pdf_generated', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"decision":"apply"}');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'Cover letter template content',
      );

      expect(result.promptText).toBe('Cover letter template content');
      expect(result.inputContext).toContain('vacancy text');
      expect(result.inputContext).toContain('{"decision":"apply"}');
      expect(result.inputContext).toContain('{"headline":"Backend Engineer"}');
      expect(result.inputContext).toContain('Acme Corp');
      expect(result.inputContext).toContain('Master_Profile_Summary.md');
    });

    it('throws BadRequestException when 00_vacancy_source.txt is missing', async () => {
      artifactStorage.readFile.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow();
    });

    it('throws BadRequestException when 02_targeted_cv_content.json is missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        return Promise.reject(new Error('ENOENT'));
      });

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to placeholder when vacancy analysis is missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[No vacancy analysis artifact available]',
      );
    });

    it('sourceSnapshot references vacancy source, CV content and knowledge sources', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.vacancySourcePath).toContain('00_vacancy_source.txt');
      expect(snapshot.cvContentPath).toContain('02_targeted_cv_content.json');
      expect(snapshot.knowledgeSources).toHaveLength(1);
      expect(snapshot.knowledgeSources[0].contentHash).toBe('hash-ks-1');
    });
  });
});
