import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SlugService } from '../common/slug/slug.service';
import {
  ImportSuggestedStatus,
  LegacyArtifactType,
} from './dto/import-scan-result.dto';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jobflow-import-test-'));
    service = new ImportService(new SlugService());
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeFixtureFile(folder: string, fileName: string) {
    await fs.writeFile(path.join(folder, fileName), 'fixture content', 'utf-8');
  }

  describe('scanRoot', () => {
    it('detects Action1 (vacancy source + legacy targeted CV content + CV PDF -> cv_pdf_generated)', async () => {
      const folder = path.join(tmpDir, 'Action1', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(
        folder,
        'Action1_Backend_Developer_Node_js_JavaScript_TypeScript.txt',
      );
      await writeFixtureFile(
        folder,
        '03_targeted_CV_content_Action1_Backend_Developer.md',
      );
      await writeFixtureFile(
        folder,
        'Denys_Strakhov_Action1_Backend_Developer_CV.pdf',
      );

      const [result] = await service.scanRoot(tmpDir);

      expect(result.companyNameOriginal).toBe('Action1');
      expect(result.companySlug).toBe('Action1');
      expect(result.legacyDate).toBe('2026-06-23');
      expect(result.legacyDateConfidence).toBe('high');
      expect(result.roleTitleOriginal).toBe(
        'Backend Developer Node js JavaScript TypeScript',
      );
      expect(result.vacancySourceCandidates).toHaveLength(1);
      expect(result.detectedArtifacts.map((a) => a.type).sort()).toEqual(
        [
          LegacyArtifactType.vacancy_source,
          LegacyArtifactType.legacy_targeted_cv_content_md,
          LegacyArtifactType.legacy_cv_pdf,
        ].sort(),
      );
      expect(result.suggestedStatus).toBe(
        ImportSuggestedStatus.cv_pdf_generated,
      );
      expect(result.warnings).toEqual([]);
    });

    it('detects Amach (adds cover letter PDF -> cover_letter_generated)', async () => {
      const folder = path.join(tmpDir, 'Amach', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Amach_Full_Stack_Developer.txt');
      await writeFixtureFile(
        folder,
        '03_targeted_CV_content_Amach_Full_Stack_Developer.md',
      );
      await writeFixtureFile(
        folder,
        'Denys_Strakhov_Amach_Full_Stack_Developer_CV.pdf',
      );
      await writeFixtureFile(
        folder,
        'Denys_Strakhov_Amach_Full_Stack_Developer_Cover_Letter.pdf',
      );

      const [result] = await service.scanRoot(tmpDir);

      expect(result.companyNameOriginal).toBe('Amach');
      expect(result.roleTitleOriginal).toBe('Full Stack Developer');
      expect(result.detectedArtifacts.map((a) => a.type).sort()).toEqual(
        [
          LegacyArtifactType.vacancy_source,
          LegacyArtifactType.legacy_targeted_cv_content_md,
          LegacyArtifactType.legacy_cv_pdf,
          LegacyArtifactType.legacy_cover_letter_pdf,
        ].sort(),
      );
      expect(result.suggestedStatus).toBe(
        ImportSuggestedStatus.cover_letter_generated,
      );
      expect(result.warnings).toEqual([]);
    });

    it('detects AppsFlyer (vacancy source only -> source_saved)', async () => {
      const folder = path.join(tmpDir, 'AppsFlyer', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'AppsFlyer_Backend_Engineer.txt');

      const [result] = await service.scanRoot(tmpDir);

      expect(result.companyNameOriginal).toBe('AppsFlyer');
      expect(result.roleTitleOriginal).toBe('Backend Engineer');
      expect(result.detectedArtifacts.map((a) => a.type)).toEqual([
        LegacyArtifactType.vacancy_source,
      ]);
      expect(result.suggestedStatus).toBe(ImportSuggestedStatus.source_saved);
      expect(result.warnings).toEqual([]);
    });

    it('detects Broadvoice skip (skip reason -> skipped, mismatched role titles warn)', async () => {
      const folder = path.join(tmpDir, 'Broadvoice', '2026.06.24');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(
        folder,
        'Broadvoice_Software_Engineer_ReactJS_TypeScript_NodeJS.txt',
      );
      await writeFixtureFile(
        folder,
        'SKIP_Broadvoice_Full_Stack_Engineer_AI_CCaaS_reason_RU.md',
      );

      const [result] = await service.scanRoot(tmpDir);

      expect(result.companyNameOriginal).toBe('Broadvoice');
      expect(result.legacyDate).toBe('2026-06-24');
      expect(result.detectedArtifacts.map((a) => a.type).sort()).toEqual(
        [
          LegacyArtifactType.vacancy_source,
          LegacyArtifactType.legacy_skip_reason_md,
        ].sort(),
      );
      expect(result.suggestedStatus).toBe(ImportSuggestedStatus.skipped);
      expect(result.roleTitleOriginal).toBe(
        'Software Engineer ReactJS TypeScript NodeJS',
      );
      expect(
        result.warnings.some((w) => w.includes('Role title differs')),
      ).toBe(true);
    });

    it('does not create any files or mutate the scanned folder (read-only)', async () => {
      const folder = path.join(tmpDir, 'AppsFlyer', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'AppsFlyer_Backend_Engineer.txt');

      await service.scanRoot(tmpDir);

      const entries = await fs.readdir(folder);
      expect(entries).toEqual(['AppsFlyer_Backend_Engineer.txt']);
    });

    it('flags multiple vacancy source candidates instead of guessing', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');

      const [result] = await service.scanRoot(tmpDir);

      expect(result.vacancySourceCandidates).toHaveLength(2);
      expect(result.roleTitleOriginal).toBeUndefined();
      expect(
        result.warnings.some((w) =>
          w.includes('Multiple vacancy source candidates'),
        ),
      ).toBe(true);
    });

    it('marks low date confidence when the date folder name cannot be parsed', async () => {
      const folder = path.join(tmpDir, 'Unclear', 'not-a-date');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Unclear_Some_Role.txt');

      const [result] = await service.scanRoot(tmpDir);

      expect(result.legacyDateConfidence).toBe('low');
    });

    it('returns import_needs_review when no recognizable artifacts exist', async () => {
      const folder = path.join(tmpDir, 'Empty', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'notes.pdf');

      const [result] = await service.scanRoot(tmpDir);

      expect(result.suggestedStatus).toBe(
        ImportSuggestedStatus.import_needs_review,
      );
    });
  });
});
