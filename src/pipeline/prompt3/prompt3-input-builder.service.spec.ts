import { BadRequestException } from '@nestjs/common';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
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

describe('Prompt3InputBuilderService', () => {
  let service: Prompt3InputBuilderService;
  let artifactStorage: jest.Mocked<ArtifactStorageService>;

  beforeEach(() => {
    artifactStorage = {
      readFile: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    service = new Prompt3InputBuilderService(artifactStorage);
  });

  describe('buildPrompt3Input', () => {
    it('throws BadRequestException for statuses other than cv_draft_ready/paused_after_cv_draft', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'cv_generation_running',
        'export_running',
        'cv_pdf_generated',
      ]) {
        await expect(
          service.buildPrompt3Input(makeWorkspace(status), 'template'),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFile).not.toHaveBeenCalled();
    });

    it('returns full input for status=cv_draft_ready', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"decision":"apply"}');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('cv_draft_ready'),
        'Prompt 3 template content',
      );

      expect(result.promptText).toBe('Prompt 3 template content');
      expect(result.inputContext).toContain('{"headline":"Backend Engineer"}');
      expect(result.inputContext).toContain('{"decision":"apply"}');
      expect(result.inputContext).toContain('Acme Corp');
    });

    it('accepts status=paused_after_cv_draft', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('not found'));
      });

      await expect(
        service.buildPrompt3Input(
          makeWorkspace('paused_after_cv_draft'),
          'template',
        ),
      ).resolves.toBeDefined();
    });

    it('throws BadRequestException when 02_targeted_cv_content.json is missing', async () => {
      artifactStorage.readFile.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.buildPrompt3Input(makeWorkspace('cv_draft_ready'), 'template'),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to a placeholder when 01_vacancy_analysis.json is missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt3Input(
        makeWorkspace('cv_draft_ready'),
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
        makeWorkspace('cv_draft_ready'),
        'template',
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.cvContentPath).toContain('02_targeted_cv_content.json');
    });
  });
});
