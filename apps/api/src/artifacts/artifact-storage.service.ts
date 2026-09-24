import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { isEexistError, isEnoentError } from './fs-errors';

@Injectable()
export class ArtifactStorageService {
  private readonly _storageRoot: string;

  constructor(private readonly configService: ConfigService) {
    this._storageRoot = path.resolve(
      configService.getOrThrow<string>('STORAGE_ROOT'),
    );
  }

  get storageRoot(): string {
    return this._storageRoot;
  }

  async createWorkspaceFolder(
    workspaceSlug: string,
  ): Promise<{ absolutePath: string; relativePath: string }> {
    const absolutePath = path.resolve(this._storageRoot, workspaceSlug);
    this.assertInsideStorageRoot(absolutePath);
    await fs.mkdir(absolutePath, { recursive: true });
    return { absolutePath, relativePath: workspaceSlug };
  }

  // Atomic: the leaf is created without `recursive`, so two concurrent creates cannot both
  // win. Returns null when the folder already exists (it belongs to someone else).
  async createWorkspaceFolderExclusive(
    workspaceSlug: string,
  ): Promise<{ absolutePath: string; relativePath: string } | null> {
    const absolutePath = path.resolve(this._storageRoot, workspaceSlug);
    // Inline (not only via assertInsideStorageRoot): the containment check must be visible to
    // static analysis in the same function as the fs sink.
    const rootWithSep = this._storageRoot.endsWith(path.sep)
      ? this._storageRoot
      : this._storageRoot + path.sep;
    if (!absolutePath.startsWith(rootWithSep)) {
      throw new Error(
        `Path traversal detected: "${absolutePath}" is outside storage root "${this._storageRoot}"`,
      );
    }
    await fs.mkdir(this._storageRoot, { recursive: true });
    try {
      await fs.mkdir(absolutePath);
    } catch (error) {
      if (isEexistError(error)) {
        return null;
      }
      throw error;
    }
    return { absolutePath, relativePath: workspaceSlug };
  }

  async removeWorkspaceFolder(absolutePath: string): Promise<void> {
    this.assertInsideStorageRoot(absolutePath);
    await fs.rm(absolutePath, { recursive: true, force: true });
  }

  async saveVacancySource(
    workspaceFolderPath: string,
    text: string,
  ): Promise<{ filePath: string; hash: string }> {
    const filePath = path.join(workspaceFolderPath, '00_vacancy_source.txt');
    this.assertInsideStorageRoot(filePath);
    await fs.writeFile(filePath, text, 'utf-8');
    const hash = createHash('sha256').update(text, 'utf-8').digest('hex');
    return { filePath, hash };
  }

  async readFile(absolutePath: string): Promise<string> {
    this.assertInsideStorageRoot(absolutePath);
    return fs.readFile(absolutePath, 'utf-8');
  }

  // A missing file is "no value"; any other failure (EACCES, EIO, path traversal) must not be
  // mistaken for "artifact does not exist", so it propagates.
  async readFileIfExists(absolutePath: string): Promise<string | null> {
    try {
      return await this.readFile(absolutePath);
    } catch (error) {
      if (isEnoentError(error)) {
        return null;
      }
      throw error;
    }
  }

  async writeFile(
    workspaceFolderPath: string,
    fileName: string,
    content: string,
  ): Promise<{ filePath: string; hash: string }> {
    const filePath = path.join(workspaceFolderPath, fileName);
    this.assertInsideStorageRoot(filePath);
    await fs.writeFile(filePath, content, 'utf-8');
    const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
    return { filePath, hash };
  }

  resolveWorkspacePath(workspaceSlug: string): string {
    return path.resolve(this._storageRoot, workspaceSlug);
  }

  async workspaceFolderExists(workspaceSlug: string): Promise<boolean> {
    const absolutePath = path.resolve(this._storageRoot, workspaceSlug);
    // Inline (not only via assertInsideStorageRoot): the containment check must be visible to
    // static analysis in the same function as the fs sink.
    const rootWithSep = this._storageRoot.endsWith(path.sep)
      ? this._storageRoot
      : this._storageRoot + path.sep;
    if (!absolutePath.startsWith(rootWithSep)) {
      throw new Error(
        `Path traversal detected: "${absolutePath}" is outside storage root "${this._storageRoot}"`,
      );
    }
    try {
      await fs.stat(absolutePath);
      return true;
    } catch (error) {
      if (isEnoentError(error)) {
        return false;
      }
      throw error;
    }
  }

  // Best-effort delete: used to invalidate a stale artifact file (e.g. a pre-PDF-check result
  // that no longer applies to a just-regenerated CV draft) — a missing file is not an error here.
  async deleteFileIfExists(absolutePath: string): Promise<void> {
    this.assertInsideStorageRoot(absolutePath);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if (!isEnoentError(error)) {
        throw error;
      }
    }
  }

  private assertInsideStorageRoot(resolvedPath: string): void {
    const rootWithSep = this._storageRoot.endsWith(path.sep)
      ? this._storageRoot
      : this._storageRoot + path.sep;
    if (
      resolvedPath !== this._storageRoot &&
      !resolvedPath.startsWith(rootWithSep)
    ) {
      throw new Error(
        `Path traversal detected: "${resolvedPath}" is outside storage root "${this._storageRoot}"`,
      );
    }
  }
}
