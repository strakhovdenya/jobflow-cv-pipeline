import {
  LEGACY_ARTIFACTS,
  LEGACY_WORKSPACE,
  activeTemplate,
  createWorkspaceStorage,
  fingerprintModelInput,
} from '../../../test/legacy-input-reference.helper';
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
      readFileIfExists: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    service = new Prompt5InputBuilderService(artifactStorage);
  });

  describe('buildPrompt5Input', () => {
    it('throws BadRequestException for statuses other than cv_pdf_generated/cover_letter_generated', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'cv_generation_running',
        'cv_draft_ready',
        'paused_after_cv_draft',
        'export_running',
        'final_check_ready',
      ]) {
        await expect(
          service.buildPrompt5Input(makeWorkspace(status), 'template'),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFileIfExists).not.toHaveBeenCalled();
    });

    it('returns full input for status=cover_letter_generated when no final check has run yet', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>Backend Engineer CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt5Input(
        makeWorkspace('cover_letter_generated'),
        'Prompt 5 template content',
      );

      expect(result.promptText).toBe('Prompt 5 template content');
      expect(result.inputContext).toContain('<html>Backend Engineer CV</html>');
    });

    it('throws BadRequestException for status=cover_letter_generated when final check already ran', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('05_final_check.json'))
          return Promise.resolve('{"final_decision":"ready_to_send"}');
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.resolve(null);
      });

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cover_letter_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(artifactStorage.readFileIfExists).not.toHaveBeenCalledWith(
        expect.stringContaining('04_cv_export.html'),
      );
    });

    it('returns full input for status=cv_pdf_generated', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>Backend Engineer CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"decision":"apply"}');
        if (p.endsWith('03_pre_pdf_check.json'))
          return Promise.resolve('{"readiness":"ready"}');
        return Promise.resolve(null);
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

    it('propagates a non-ENOENT read error instead of reporting a missing required artifact', async () => {
      const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      artifactStorage.readFileIfExists.mockRejectedValue(denied);

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toBe(denied);
    });

    it('propagates a non-ENOENT read error on an artifact that is otherwise optional or has a fallback', async () => {
      const denied = Object.assign(new Error('EIO'), { code: 'EIO' });
      artifactStorage.readFileIfExists.mockImplementation((p: string) =>
        p.endsWith('01_vacancy_analysis.json')
          ? Promise.reject(denied)
          : Promise.resolve('{}'),
      );

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toBe(denied);
    });

    it('throws BadRequestException when 04_cv_export.html is missing', async () => {
      artifactStorage.readFileIfExists.mockResolvedValue(null);

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when 02_targeted_cv_content.json is missing', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        return Promise.resolve(null);
      });

      await expect(
        service.buildPrompt5Input(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to placeholders when optional artifacts are missing', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.resolve(null);
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
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('04_cv_export.html'))
          return Promise.resolve('<html>CV</html>');
        if (p.endsWith('02_targeted_cv_content.json'))
          return Promise.resolve('{"headline":"Backend Engineer"}');
        return Promise.resolve(null);
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

// ADR-046 item 1 and its amendment of 2026-11-26: the template and the complete input context of
// a legacy workspace, recorded on the unchanged post-#709 code with the real active template and
// sources. A change of either fingerprint is a change of the legacy Prompt 5 input.
const LEGACY_PROMPT5_INPUT = {
  templateVersion: 1,
  template: {
    sha256: 'abce431a9d240ad76946851e4152a52b8a9811473d84ac99c091ad6d46ff9487',
    length: 2666,
  },
  inputContext: {
    sha256: 'f362dba8e99f6aa4bff32854c7e5850ad483ad251dca110deff8c27e8ebf891d',
    length: 8731,
  },
};

describe('Prompt5InputBuilderService — legacy invariance', () => {
  it('keeps the legacy Prompt 5 input byte-identical', async () => {
    const template = activeTemplate('prompt_5');
    const builder = new Prompt5InputBuilderService(
      createWorkspaceStorage(
        LEGACY_ARTIFACTS,
      ) as unknown as ArtifactStorageService,
    );

    const result = await builder.buildPrompt5Input(
      { ...LEGACY_WORKSPACE, status: 'cv_pdf_generated' },
      template.content,
    );

    expect(result.promptText).toBe(template.content);
    expect(
      fingerprintModelInput(
        template.version,
        result.promptText,
        result.inputContext,
      ),
    ).toEqual(LEGACY_PROMPT5_INPUT);
  });
});
