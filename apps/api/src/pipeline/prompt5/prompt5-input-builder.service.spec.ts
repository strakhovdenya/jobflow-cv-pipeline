import { BadRequestException } from '@nestjs/common';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import {
  Prompt5InputBuilderService,
  Prompt5WorkspaceContext,
} from './prompt5-input-builder.service';

function makeWorkspace(status: string): Prompt5WorkspaceContext {
  return {
    id: 'ws-1',
    status,
    companyNameOriginal: 'Acme Corp',
    roleTitleOriginal: 'Backend Engineer',
    workspacePath: '2024-01-01_acme_corp_backend_engineer',
    storageRoot: '/storage',
  };
}

describe('Prompt5InputBuilderService', () => {
  let service: Prompt5InputBuilderService;
  let artifactStorage: jest.Mocked<ArtifactStorageService>;

  beforeEach(() => {
    artifactStorage = {
      readFile: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    service = new Prompt5InputBuilderService(artifactStorage);
  });

  describe('buildPrompt5Input', () => {
    it('throws BadRequestException for statuses other than cv_pdf_generated', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'cv_generation_running',
        'cv_draft_ready',
        'paused_after_cv_draft',
        'export_running',
      ]) {
        await expect(
          service.buildPrompt5Input(makeWorkspace(status), 'template'),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFile).not.toHaveBeenCalled();
    });

    it('returns full input for status=cv_pdf_generated', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>Backend Engineer CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"decision":"apply"}');
        if (p.endsWith('03_pre_pdf_check.json'))
          return Promise.resolve('{"readiness":"ready"}');
        return Promise.reject(new Error('not found'));
      });

      const result = await service.buildPrompt5Input(
        makeWorkspace('cv_pdf_generated'),
        'Prompt 5 template content',
      );

      expect(result.promptText).toBe('Prompt 5 template content');
      expect(result.inputContext).toContain('<html>Backend Engineer CV</html>');
      expect(result.inputContext).toContain('{"headline":"Backend Engineer"}');
      expect(result.inputContext).toContain('{"decision":"apply"}');
      expect(result.inputContext).toContain('{"readiness":"ready"}');
      expect(result.inputContext).toContain('Acme Corp');
    });

    it('throws BadRequestException when 04_cv_export.html is missing', async () => {
      artifactStorage.readFile.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when 02_targeted_cv_content.json is missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        return Promise.reject(new Error('ENOENT'));
      });

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to placeholders when optional artifacts are missing', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt5Input(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[No vacancy analysis artifact available]',
      );
      expect(result.inputContext).toContain(
        '[No pre-PDF check artifact available]',
      );
    });

    it('sourceSnapshot references the CV export and CV content paths', async () => {
      artifactStorage.readFile.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.buildPrompt5Input(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.cvExportHtmlPath).toContain('04_cv_export.html');
      expect(snapshot.cvContentPath).toContain('02_targeted_cv_content.json');
    });
  });
});
