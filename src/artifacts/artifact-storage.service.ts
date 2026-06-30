import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getStorageRoot } from '../config/storage.config';

@Injectable()
export class ArtifactStorageService {
  private readonly _storageRoot: string;

  constructor() {
    this._storageRoot = path.resolve(getStorageRoot());
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

  async saveVacancySource(
    workspaceFolderPath: string,
    text: string,
  ): Promise<{ filePath: string; hash: string }> {
    const filePath = path.join(workspaceFolderPath, '00_vacancy_source.txt');
    await fs.writeFile(filePath, text, 'utf-8');
    const hash = createHash('sha256').update(text, 'utf-8').digest('hex');
    return { filePath, hash };
  }

  async readFile(absolutePath: string): Promise<string> {
    this.assertInsideStorageRoot(absolutePath);
    return fs.readFile(absolutePath, 'utf-8');
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
