import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ArtifactStorageService } from './artifact-storage.service';

describe('ArtifactStorageService', () => {
  let service: ArtifactStorageService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jobflow-test-'));
    const configService = {
      get: (key: string) => (key === 'STORAGE_ROOT' ? tmpDir : undefined),
      getOrThrow: (key: string) =>
        key === 'STORAGE_ROOT' ? tmpDir : undefined,
    } as unknown as ConfigService;
    service = new ArtifactStorageService(configService);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('createWorkspaceFolder', () => {
    it('creates the workspace folder on disk', async () => {
      const slug = '2026_06_29_Action1_Backend_Developer';
      const { absolutePath, relativePath } =
        await service.createWorkspaceFolder(slug);

      expect(relativePath).toBe(slug);
      const stat = await fs.stat(absolutePath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('returns absolute path inside the storage root', async () => {
      const slug = '2026_06_29_Test_Company_Role';
      const { absolutePath } = await service.createWorkspaceFolder(slug);
      expect(absolutePath.startsWith(tmpDir)).toBe(true);
    });

    it('throws on path traversal attempt', async () => {
      await expect(service.createWorkspaceFolder('../outside')).rejects.toThrow(
        /Path traversal/,
      );
    });
  });

  describe('createWorkspaceFolderExclusive', () => {
    it('creates the folder and returns its paths', async () => {
      const slug = '2026_06_29_Action1_Exclusive';
      const result = await service.createWorkspaceFolderExclusive(slug);

      expect(result?.relativePath).toBe(slug);
      const stat = await fs.stat(result!.absolutePath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('returns null and keeps existing files when the folder already exists', async () => {
      const slug = '2026_06_29_Action1_Exclusive_Taken';
      const first = await service.createWorkspaceFolderExclusive(slug);
      const filePath = path.join(first!.absolutePath, 'keep.txt');
      await fs.writeFile(filePath, 'keep', 'utf-8');

      const second = await service.createWorkspaceFolderExclusive(slug);

      expect(second).toBeNull();
      expect(await fs.readFile(filePath, 'utf-8')).toBe('keep');
    });

    it('throws on path traversal attempt', async () => {
      await expect(
        service.createWorkspaceFolderExclusive('../outside'),
      ).rejects.toThrow(/Path traversal/);
    });
  });

  describe('saveVacancySource', () => {
    it('saves vacancy text as 00_vacancy_source.txt in UTF-8', async () => {
      const slug = '2026_06_29_Action1_Test_Role';
      const { absolutePath } = await service.createWorkspaceFolder(slug);

      const text = 'We are hiring!\nLine 2\nLine 3 — special chars: ü, é, Ω';
      const { filePath, hash } = await service.saveVacancySource(
        absolutePath,
        text,
      );

      expect(path.basename(filePath)).toBe('00_vacancy_source.txt');

      const saved = await fs.readFile(filePath, 'utf-8');
      expect(saved).toBe(text);

      const expectedHash = createHash('sha256')
        .update(text, 'utf-8')
        .digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('preserves line breaks and special characters exactly', async () => {
      const slug = '2026_06_29_Cyrillic_Тест';
      const { absolutePath } = await service.createWorkspaceFolder(slug);

      const text =
        'Вакансия: Разработчик\r\nТребования:\n- Node.js\n- TypeScript';
      const { filePath } = await service.saveVacancySource(absolutePath, text);

      const saved = await fs.readFile(filePath, 'utf-8');
      expect(saved).toBe(text);
    });

    it('throws on path traversal attempt via workspaceFolderPath', async () => {
      const outsidePath = path.join(tmpDir, '..', 'outside-workspace');
      await expect(
        service.saveVacancySource(outsidePath, 'text'),
      ).rejects.toThrow(/Path traversal/);
    });
  });

  describe('workspaceFolderExists', () => {
    it('returns true for an existing workspace folder and false for a missing one', async () => {
      await service.createWorkspaceFolder('2026_06_29_Action1_Exists_Role');

      await expect(
        service.workspaceFolderExists('2026_06_29_Action1_Exists_Role'),
      ).resolves.toBe(true);
      await expect(
        service.workspaceFolderExists('2026_06_29_Action1_Missing_Role'),
      ).resolves.toBe(false);
    });

    it('throws on a slug that escapes the storage root', async () => {
      await expect(service.workspaceFolderExists('../outside')).rejects.toThrow(
        /Path traversal/,
      );
    });
  });

  describe('removeWorkspaceFolder', () => {
    it('removes an existing workspace folder and its contents', async () => {
      const slug = '2026_06_29_Action1_Removable_Role';
      const { absolutePath } = await service.createWorkspaceFolder(slug);
      await service.saveVacancySource(absolutePath, 'text');

      await service.removeWorkspaceFolder(absolutePath);

      await expect(fs.stat(absolutePath)).rejects.toThrow();
    });

    it('does not throw when the folder does not exist', async () => {
      const missingPath = path.join(tmpDir, 'never-created');
      await expect(
        service.removeWorkspaceFolder(missingPath),
      ).resolves.not.toThrow();
    });

    it('throws on path traversal attempt', async () => {
      const outsidePath = path.join(tmpDir, '..', 'outside-workspace');
      await expect(service.removeWorkspaceFolder(outsidePath)).rejects.toThrow(
        /Path traversal/,
      );
    });
  });

  describe('readFileIfExists', () => {
    it('returns the file content when the file exists', async () => {
      const filePath = path.join(tmpDir, 'present.json');
      await fs.writeFile(filePath, '{"a":1}', 'utf-8');

      await expect(service.readFileIfExists(filePath)).resolves.toBe('{"a":1}');
    });

    it('returns null when the file does not exist (ENOENT)', async () => {
      const missingPath = path.join(tmpDir, 'never-created.json');

      await expect(service.readFileIfExists(missingPath)).resolves.toBeNull();
    });

    it('rethrows non-ENOENT read errors instead of reporting "not found"', async () => {
      const directoryPath = path.join(tmpDir, 'a-directory');
      await fs.mkdir(directoryPath);

      await expect(
        service.readFileIfExists(directoryPath),
      ).rejects.toMatchObject({ code: 'EISDIR' });
    });

    it('throws on path traversal attempt', async () => {
      const outsidePath = path.join(tmpDir, '..', 'outside-file.json');

      await expect(service.readFileIfExists(outsidePath)).rejects.toThrow(
        /Path traversal/,
      );
    });
  });

  describe('deleteFileIfExists', () => {
    it('deletes an existing file', async () => {
      const { absolutePath } = await service.createWorkspaceFolder(
        '2026_06_29_Action1_Deletable_File',
      );
      const filePath = path.join(absolutePath, '03_pre_pdf_check.json');
      await fs.writeFile(filePath, '{}', 'utf-8');

      await service.deleteFileIfExists(filePath);

      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('does not throw when the file does not exist (ENOENT is swallowed)', async () => {
      const missingPath = path.join(tmpDir, 'never-created.json');
      await expect(
        service.deleteFileIfExists(missingPath),
      ).resolves.not.toThrow();
    });

    it('throws on path traversal attempt', async () => {
      const outsidePath = path.join(tmpDir, '..', 'outside-file.json');
      await expect(service.deleteFileIfExists(outsidePath)).rejects.toThrow(
        /Path traversal/,
      );
    });
  });
});
