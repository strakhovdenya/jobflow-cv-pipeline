import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VacancyDecision, WorkspaceStatus } from '@prisma/client';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { HashService } from '../artifacts/hash.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { ImportDuplicateReason } from './dto/import-preview.dto';
import {
  ImportSuggestedStatus,
  LegacyArtifactType,
} from './dto/import-scan-result.dto';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let tmpDir: string;
  let storageDir: string;
  let idCounter: number;
  let mockPrisma: {
    applicationWorkspace: { findFirst: jest.Mock; create: jest.Mock };
    generatedArtifact: {
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    company: { create: jest.Mock };
    jobVacancy: { create: jest.Mock };
  };

  function nextId(prefix: string): string {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
  }

  beforeEach(async () => {
    idCounter = 0;
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jobflow-import-test-'));
    storageDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'jobflow-import-storage-test-'),
    );
    const configService = {
      get: (key: string) => (key === 'IMPORT_ROOT' ? tmpDir : undefined),
      getOrThrow: (key: string) => (key === 'IMPORT_ROOT' ? tmpDir : undefined),
    } as unknown as ConfigService;
    const storageConfigService = {
      get: (key: string) => (key === 'STORAGE_ROOT' ? storageDir : undefined),
      getOrThrow: (key: string) =>
        key === 'STORAGE_ROOT' ? storageDir : undefined,
    } as unknown as ConfigService;

    mockPrisma = {
      applicationWorkspace: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }) =>
          Promise.resolve({ ...data, id: nextId('ws') }),
        ),
      },
      generatedArtifact: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }) =>
          Promise.resolve({ ...data, id: nextId('artifact') }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      company: {
        create: jest.fn(({ data }) =>
          Promise.resolve({ ...data, id: nextId('company') }),
        ),
      },
      jobVacancy: {
        create: jest.fn(({ data }) =>
          Promise.resolve({ ...data, id: nextId('vacancy') }),
        ),
      },
    };

    const prisma = mockPrisma as unknown as PrismaService;
    service = new ImportService(
      new SlugService(),
      configService,
      prisma,
      new HashService(),
      new CompanyService(prisma),
      new VacancyService(prisma),
      new ArtifactStorageService(storageConfigService),
      new ArtifactsService(prisma),
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.rm(storageDir, { recursive: true, force: true });
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

      const [result] = await service.scanRoot();

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

      const [result] = await service.scanRoot();

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

      const [result] = await service.scanRoot();

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

      const [result] = await service.scanRoot();

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

      await service.scanRoot();

      const entries = await fs.readdir(folder);
      expect(entries).toEqual(['AppsFlyer_Backend_Engineer.txt']);
    });

    it('flags multiple vacancy source candidates instead of guessing', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');

      const [result] = await service.scanRoot();

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

      const [result] = await service.scanRoot();

      expect(result.legacyDateConfidence).toBe('low');
    });

    it('returns import_needs_review when no recognizable artifacts exist', async () => {
      const folder = path.join(tmpDir, 'Empty', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'notes.pdf');

      const [result] = await service.scanRoot();

      expect(result.suggestedStatus).toBe(
        ImportSuggestedStatus.import_needs_review,
      );
    });
  });

  describe('previewImport', () => {
    async function makeFolder(): Promise<string> {
      const folder = path.join(tmpDir, 'Action1', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(
        folder,
        'Action1_Backend_Developer_Node_js_TypeScript.txt',
      );
      return folder;
    }

    it('uses inferred company/role when no override is given', async () => {
      const folder = await makeFolder();

      const result = await service.previewImport(folder);

      expect(result.companyNameOriginal).toBe('Action1');
      expect(result.companySlug).toBe('Action1');
      expect(result.roleTitleOriginal).toBe(
        'Backend Developer Node js TypeScript',
      );
      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateReason).toBeUndefined();
    });

    it('applies a company name override and recomputes companySlug', async () => {
      const folder = await makeFolder();

      const result = await service.previewImport(folder, {
        companyNameOverride: 'Action One Corp',
      });

      expect(result.companyNameOriginal).toBe('Action One Corp');
      expect(result.companySlug).toBe('Action_One_Corp');
    });

    it('applies a role title override and recomputes roleSlug', async () => {
      const folder = await makeFolder();

      const result = await service.previewImport(folder, {
        roleTitleOverride: 'Senior Backend Engineer',
      });

      expect(result.roleTitleOriginal).toBe('Senior Backend Engineer');
      expect(result.roleSlug).toBe('Senior_Backend_Engineer');
    });

    it('detects a path-based duplicate via ApplicationWorkspace.sourceImportedPath', async () => {
      const folder = await makeFolder();
      mockPrisma.applicationWorkspace.findFirst.mockResolvedValueOnce({
        id: 'ws-existing-1',
      });

      const result = await service.previewImport(folder);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateReason).toBe(ImportDuplicateReason.source_path);
      expect(result.duplicateWorkspaceId).toBe('ws-existing-1');
      expect(mockPrisma.applicationWorkspace.findFirst).toHaveBeenCalledWith({
        where: { sourceImportedPath: path.resolve(folder) },
        select: { id: true },
      });
    });

    it('detects a content-hash duplicate via GeneratedArtifact.contentHash', async () => {
      const folder = await makeFolder();
      mockPrisma.generatedArtifact.findFirst.mockResolvedValueOnce({
        workspaceId: 'ws-existing-2',
      });

      const result = await service.previewImport(folder);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateReason).toBe(ImportDuplicateReason.content_hash);
      expect(result.duplicateWorkspaceId).toBe('ws-existing-2');
      expect(mockPrisma.generatedArtifact.findFirst).toHaveBeenCalledWith({
        where: {
          artifactType: 'vacancy_source',
          contentHash: expect.any(String),
        },
        select: { workspaceId: true },
      });
    });

    it('skips the content-hash check when there are multiple vacancy source candidates', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');

      const result = await service.previewImport(folder);

      expect(result.isDuplicate).toBe(false);
      expect(mockPrisma.generatedArtifact.findFirst).not.toHaveBeenCalled();
    });

    it('reports no duplicate when neither signal matches', async () => {
      const folder = await makeFolder();

      const result = await service.previewImport(folder);

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateReason).toBeUndefined();
      expect(result.duplicateWorkspaceId).toBeUndefined();
    });

    it('rejects a folderPath outside the configured IMPORT_ROOT (path traversal)', async () => {
      const outsideDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'jobflow-import-outside-'),
      );

      try {
        await expect(service.previewImport(outsideDir)).rejects.toThrow(
          /outside the configured IMPORT_ROOT/,
        );
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('rejects a relative folderPath that escapes IMPORT_ROOT via ../ segments', async () => {
      await makeFolder();

      await expect(
        service.previewImport(path.join(tmpDir, '..', 'escaped')),
      ).rejects.toThrow(/outside the configured IMPORT_ROOT/);
    });

    it('accepts an IMPORT_ROOT that already ends with a path separator', () => {
      const importRootWithSep = tmpDir.endsWith(path.sep)
        ? tmpDir
        : tmpDir + path.sep;
      const nestedPath = path.join(importRootWithSep, 'Company', '2026.01.01');

      expect(() =>
        (
          service as unknown as {
            assertInsideImportRoot: (
              resolvedPath: string,
              importRoot: string,
            ) => void;
          }
        ).assertInsideImportRoot(nestedPath, importRootWithSep),
      ).not.toThrow();
    });
  });

  describe('confirmImport', () => {
    it('imports an Action1-style folder (vacancy source + targeted CV content + CV PDF) without copying files', async () => {
      const folder = path.join(tmpDir, 'Action1', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(
        folder,
        'Action1_Backend_Developer_Node_js_TypeScript.txt',
      );
      await writeFixtureFile(
        folder,
        '03_targeted_CV_content_Action1_Backend_Developer.md',
      );
      await writeFixtureFile(
        folder,
        'Denys_Strakhov_Action1_Backend_Developer_CV.pdf',
      );

      const result = await service.confirmImport(folder);

      expect(result.status).toBe(WorkspaceStatus.cv_pdf_generated);
      expect(result.registeredArtifactIds).toHaveLength(3);

      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nameOriginal: 'Action1',
            companySlug: 'Action1',
          }),
        }),
      );
      expect(mockPrisma.jobVacancy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceFormat: 'legacy_import',
            originalImportedFileName:
              'Action1_Backend_Developer_Node_js_TypeScript.txt',
          }),
        }),
      );
      expect(mockPrisma.applicationWorkspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdFrom: 'import',
            sourceImportedPath: path.resolve(folder),
            status: WorkspaceStatus.cv_pdf_generated,
          }),
        }),
      );

      const vacancySourceCall =
        mockPrisma.generatedArtifact.create.mock.calls.find(
          ([{ data }]) => data.artifactType === 'vacancy_source',
        );
      expect(vacancySourceCall[0].data).toEqual(
        expect.objectContaining({
          canonicalFileName: 'Action1_Backend_Developer_Node_js_TypeScript.txt',
          filePath: path.join(
            folder,
            'Action1_Backend_Developer_Node_js_TypeScript.txt',
          ),
          storageRoot: path.resolve(tmpDir),
          origin: 'imported',
        }),
      );

      const workspaceFolder = path.join(storageDir, result.workspaceSlug);
      await expect(fs.access(workspaceFolder)).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(workspaceFolder, '00_vacancy_source.txt')),
      ).rejects.toThrow();
    });

    it('imports an Amach-style folder (adds cover letter PDF) -> cover_letter_generated, 4 artifacts', async () => {
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

      const result = await service.confirmImport(folder);

      expect(result.status).toBe(WorkspaceStatus.cover_letter_generated);
      expect(result.registeredArtifactIds).toHaveLength(4);
    });

    it('imports an AppsFlyer-style folder (vacancy source only) with copyVacancySourceToCanonical', async () => {
      const folder = path.join(tmpDir, 'AppsFlyer', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'AppsFlyer_Backend_Engineer.txt');

      const result = await service.confirmImport(folder, {
        copyVacancySourceToCanonical: true,
      });

      expect(result.status).toBe(WorkspaceStatus.source_saved);
      expect(result.registeredArtifactIds).toHaveLength(1);

      const canonicalPath = path.join(
        storageDir,
        result.workspaceSlug,
        '00_vacancy_source.txt',
      );
      await expect(fs.readFile(canonicalPath, 'utf-8')).resolves.toBe(
        'fixture content',
      );

      const vacancySourceCall =
        mockPrisma.generatedArtifact.create.mock.calls.find(
          ([{ data }]) => data.artifactType === 'vacancy_source',
        );
      expect(vacancySourceCall[0].data).toEqual(
        expect.objectContaining({
          canonicalFileName: '00_vacancy_source.txt',
          filePath: canonicalPath,
          storageRoot: path.resolve(storageDir),
        }),
      );
    });

    it('imports a Broadvoice-style skip folder -> skipped, isSkipped true, currentDecision skip', async () => {
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

      const result = await service.confirmImport(folder);

      expect(result.status).toBe(WorkspaceStatus.skipped);
      expect(mockPrisma.applicationWorkspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WorkspaceStatus.skipped,
            isSkipped: true,
            currentDecision: VacancyDecision.skip,
          }),
        }),
      );
    });

    it('rejects a duplicate folder without creating any records', async () => {
      const folder = path.join(tmpDir, 'Action1', '2026.06.23');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(
        folder,
        'Action1_Backend_Developer_Node_js_TypeScript.txt',
      );
      mockPrisma.applicationWorkspace.findFirst.mockResolvedValueOnce({
        id: 'ws-existing-1',
      });

      await expect(service.confirmImport(folder)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.company.create).not.toHaveBeenCalled();
    });

    it('rejects an ambiguous vacancy source without selectedVacancySourcePath (roleTitleOriginal also missing)', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');

      await expect(service.confirmImport(folder)).rejects.toThrow(
        /roleTitleOriginal could not be inferred/,
      );
      expect(mockPrisma.company.create).not.toHaveBeenCalled();
    });

    it('rejects an ambiguous vacancy source without selectedVacancySourcePath (roleTitleOverride given)', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');

      await expect(
        service.confirmImport(folder, { roleTitleOverride: 'Chosen Role' }),
      ).rejects.toThrow(/Multiple vacancy source candidates found/);
      expect(mockPrisma.company.create).not.toHaveBeenCalled();
    });

    it('accepts an ambiguous vacancy source when selectedVacancySourcePath matches a candidate', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');
      const selected = path.join(folder, 'Multi_Role_One.txt');

      const result = await service.confirmImport(folder, {
        selectedVacancySourcePath: selected,
        roleTitleOverride: 'Chosen Role',
      });

      expect(result.registeredArtifactIds).toHaveLength(1);
    });

    it('rejects a folder with no recognizable artifacts (import_needs_review)', async () => {
      const folder = path.join(tmpDir, 'Empty', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'notes.pdf');

      await expect(service.confirmImport(folder)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.company.create).not.toHaveBeenCalled();
    });

    it('rejects a folder with a CV PDF but no vacancy source file', async () => {
      const folder = path.join(tmpDir, 'NoSource', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Denys_Strakhov_NoSource_Role_CV.pdf');

      await expect(
        service.confirmImport(folder, { roleTitleOverride: 'Some Role' }),
      ).rejects.toThrow(/No vacancy source file found/);
      expect(mockPrisma.company.create).not.toHaveBeenCalled();
    });

    it('rejects an ambiguous vacancy source when selectedVacancySourcePath does not match any candidate', async () => {
      const folder = path.join(tmpDir, 'Multi', '2026.01.01');
      await fs.mkdir(folder, { recursive: true });
      await writeFixtureFile(folder, 'Multi_Role_One.txt');
      await writeFixtureFile(folder, 'Multi_Role_Two.txt');

      await expect(
        service.confirmImport(folder, {
          roleTitleOverride: 'Chosen Role',
          selectedVacancySourcePath: path.join(folder, 'Not_A_Candidate.txt'),
        }),
      ).rejects.toThrow(/Multiple vacancy source candidates found/);
      expect(mockPrisma.company.create).not.toHaveBeenCalled();
    });
  });
});
