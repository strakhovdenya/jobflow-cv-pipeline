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
    process.env.STORAGE_ROOT = tmpDir;
    service = new ArtifactStorageService();
  });

  afterEach(async () => {
    delete process.env.STORAGE_ROOT;
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
  });
});
