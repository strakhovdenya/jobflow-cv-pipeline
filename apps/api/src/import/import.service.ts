import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VacancyDecision, WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { HashService } from '../artifacts/hash.service';
import { SlugService } from '../common/slug/slug.service';
import { CompanyService } from '../company/company.service';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyService } from '../vacancy/vacancy.service';
import { ImportConfirmResultDto } from './dto/import-confirm.dto';
import {
  DetectedLegacyArtifactDto,
  ImportScanResultDto,
  ImportSuggestedStatus,
  LegacyArtifactType,
} from './dto/import-scan-result.dto';
import {
  ImportDuplicateReason,
  ImportPreviewResultDto,
} from './dto/import-preview.dto';

const DATE_FOLDER_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})$/;
const TARGETED_CV_CONTENT_PATTERN = /^03_targeted_CV_content_.*\.md$/i;
const CV_PDF_PATTERN = /_CV\.pdf$/i;
const COVER_LETTER_PATTERN = /(_Cover_Letter\.pdf|^cover_letter\.pdf)$/i;
const SKIP_REASON_PATTERN = /^SKIP_.*\.(md|txt)$/i;
const SKIP_PREFIX_PATTERN = /^SKIP_/i;
const REASON_SUFFIX_PATTERN = /_reason_[A-Za-z]{2}$/i;
const VACANCY_SOURCE_ARTIFACT_TYPE = 'vacancy_source';
const CANONICAL_VACANCY_SOURCE_FILE_NAME = '00_vacancy_source.txt';

const LEGACY_ARTIFACT_MIME_TYPES: Record<LegacyArtifactType, string> = {
  [LegacyArtifactType.vacancy_source]: 'text/plain',
  [LegacyArtifactType.legacy_targeted_cv_content_md]: 'text/markdown',
  [LegacyArtifactType.legacy_cv_pdf]: 'application/pdf',
  [LegacyArtifactType.legacy_cover_letter_pdf]: 'application/pdf',
  [LegacyArtifactType.legacy_skip_reason_md]: 'text/markdown',
};

const SUGGESTED_TO_WORKSPACE_STATUS: Partial<
  Record<ImportSuggestedStatus, WorkspaceStatus>
> = {
  [ImportSuggestedStatus.skipped]: WorkspaceStatus.skipped,
  [ImportSuggestedStatus.cover_letter_generated]:
    WorkspaceStatus.cover_letter_generated,
  [ImportSuggestedStatus.cv_pdf_generated]: WorkspaceStatus.cv_pdf_generated,
  [ImportSuggestedStatus.cv_draft_ready]: WorkspaceStatus.cv_draft_ready,
  [ImportSuggestedStatus.source_saved]: WorkspaceStatus.source_saved,
};

export interface ImportPreviewOverrides {
  companyNameOverride?: string;
  roleTitleOverride?: string;
}

export interface ImportConfirmOptions {
  companyNameOverride?: string;
  roleTitleOverride?: string;
  selectedVacancySourcePath?: string;
  copyVacancySourceToCanonical?: boolean;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly slugService: SlugService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly companyService: CompanyService,
    private readonly vacancyService: VacancyService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  async scanRoot(): Promise<ImportScanResultDto[]> {
    const rootPath = path.resolve(
      this.configService.getOrThrow<string>('IMPORT_ROOT'),
    );
    const results: ImportScanResultDto[] = [];
    const companyEntries = await this.listDirectories(rootPath);

    for (const companyName of companyEntries) {
      const companyPath = path.join(rootPath, companyName);
      const dateFolders = await this.listDirectories(companyPath);

      for (const dateFolderName of dateFolders) {
        const folderPath = path.join(companyPath, dateFolderName);
        results.push(
          await this.scanDateFolder(folderPath, companyName, dateFolderName),
        );
      }
    }

    return results;
  }

  async previewImport(
    folderPath: string,
    overrides: ImportPreviewOverrides = {},
  ): Promise<ImportPreviewResultDto> {
    const importRoot = path.resolve(
      this.configService.getOrThrow<string>('IMPORT_ROOT'),
    );
    const resolvedFolderPath = path.resolve(importRoot, folderPath);
    this.assertInsideImportRoot(resolvedFolderPath, importRoot);

    const companyNameFromFolder = path.basename(
      path.dirname(resolvedFolderPath),
    );
    const dateFolderName = path.basename(resolvedFolderPath);

    const scan = await this.scanDateFolder(
      resolvedFolderPath,
      companyNameFromFolder,
      dateFolderName,
    );

    const companyNameOriginal =
      overrides.companyNameOverride ?? scan.companyNameOriginal;
    const companySlug = overrides.companyNameOverride
      ? this.slugService.normalizeCompanySlug(overrides.companyNameOverride)
      : scan.companySlug;

    const roleTitleOriginal =
      overrides.roleTitleOverride ?? scan.roleTitleOriginal;
    const roleSlug = overrides.roleTitleOverride
      ? this.slugService.normalizeRoleSlug(overrides.roleTitleOverride)
      : scan.roleSlug;

    const duplicate = await this.detectDuplicate(
      resolvedFolderPath,
      scan.vacancySourceCandidates,
    );

    return {
      folderPath: scan.folderPath,
      companyNameOriginal,
      companySlug,
      ...(roleTitleOriginal !== undefined ? { roleTitleOriginal } : {}),
      ...(roleSlug !== undefined ? { roleSlug } : {}),
      legacyDate: scan.legacyDate,
      legacyDateConfidence: scan.legacyDateConfidence,
      vacancySourceCandidates: scan.vacancySourceCandidates,
      detectedArtifacts: scan.detectedArtifacts,
      suggestedStatus: scan.suggestedStatus,
      warnings: scan.warnings,
      isDuplicate: duplicate !== null,
      ...(duplicate !== null
        ? {
            duplicateReason: duplicate.reason,
            duplicateWorkspaceId: duplicate.workspaceId,
          }
        : {}),
    };
  }

  async confirmImport(
    folderPath: string,
    options: ImportConfirmOptions = {},
  ): Promise<ImportConfirmResultDto> {
    const importRoot = path.resolve(
      this.configService.getOrThrow<string>('IMPORT_ROOT'),
    );

    const preview = await this.previewImport(folderPath, {
      companyNameOverride: options.companyNameOverride,
      roleTitleOverride: options.roleTitleOverride,
    });

    if (preview.isDuplicate) {
      throw new ConflictException(
        `This folder appears to already be imported (matched by ${preview.duplicateReason}, ` +
          `existing workspace "${preview.duplicateWorkspaceId}")`,
      );
    }

    const workspaceStatus =
      SUGGESTED_TO_WORKSPACE_STATUS[preview.suggestedStatus];
    if (!workspaceStatus) {
      throw new BadRequestException(
        `Cannot import a folder with suggestedStatus "${preview.suggestedStatus}"; ` +
          'no recognizable artifacts were found',
      );
    }

    if (!preview.roleTitleOriginal || !preview.roleSlug) {
      throw new BadRequestException(
        'roleTitleOriginal could not be inferred for this folder; provide roleTitleOverride',
      );
    }

    const vacancySourcePath = this.resolveVacancySourcePath(
      preview.vacancySourceCandidates,
      options.selectedVacancySourcePath,
    );

    const company = await this.companyService.create({
      nameOriginal: preview.companyNameOriginal,
      companySlug: preview.companySlug,
    });

    const legacyDate = preview.legacyDate ?? new Date().toISOString();
    const workspaceSlug = `${this.legacyDateForSlug(legacyDate)}_${preview.companySlug}_${preview.roleSlug}`;
    const { absolutePath, relativePath } =
      await this.artifactStorage.createWorkspaceFolder(workspaceSlug);

    const vacancyTextHash = await this.hashService.hashFile(vacancySourcePath);
    const vacancyFileStat = await fs.stat(vacancySourcePath);

    let vacancyTextPath = vacancySourcePath;
    if (options.copyVacancySourceToCanonical) {
      const content = await fs.readFile(vacancySourcePath, 'utf-8');
      const copy = await this.artifactStorage.writeFile(
        absolutePath,
        CANONICAL_VACANCY_SOURCE_FILE_NAME,
        content,
      );
      vacancyTextPath = copy.filePath;
    }

    const vacancy = await this.vacancyService.create({
      roleTitleOriginal: preview.roleTitleOriginal,
      roleSlug: preview.roleSlug,
      vacancyTextPath,
      vacancyTextHash,
      vacancyTextSizeBytes: vacancyFileStat.size,
      sourceFormat: 'legacy_import',
      originalImportedFileName: path.basename(vacancySourcePath),
      company: { connect: { id: company.id } },
    });

    const isSkipped = workspaceStatus === WorkspaceStatus.skipped;
    const workspace = await this.prisma.applicationWorkspace.create({
      data: {
        workspaceSlug,
        storageRoot: this.artifactStorage.storageRoot,
        workspacePath: relativePath,
        status: workspaceStatus,
        createdFrom: 'import',
        sourceImportedPath: preview.folderPath,
        ...(isSkipped
          ? { isSkipped: true, currentDecision: VacancyDecision.skip }
          : {}),
        company: { connect: { id: company.id } },
        jobVacancy: { connect: { id: vacancy.id } },
      },
    });

    const registeredArtifactIds: string[] = [];

    if (options.copyVacancySourceToCanonical) {
      const registered = await this.artifactsService.register({
        workspaceId: workspace.id,
        artifactType: VACANCY_SOURCE_ARTIFACT_TYPE,
        canonicalFileName: CANONICAL_VACANCY_SOURCE_FILE_NAME,
        filePath: vacancyTextPath,
        storageRoot: this.artifactStorage.storageRoot,
        contentHash: vacancyTextHash,
        origin: 'imported',
        mimeType: LEGACY_ARTIFACT_MIME_TYPES[LegacyArtifactType.vacancy_source],
      });
      registeredArtifactIds.push(registered.id);
    } else {
      const registered = await this.artifactsService.register({
        workspaceId: workspace.id,
        artifactType: VACANCY_SOURCE_ARTIFACT_TYPE,
        canonicalFileName: path.basename(vacancySourcePath),
        filePath: vacancySourcePath,
        storageRoot: importRoot,
        contentHash: vacancyTextHash,
        origin: 'imported',
        mimeType: LEGACY_ARTIFACT_MIME_TYPES[LegacyArtifactType.vacancy_source],
        fileSizeBytes: vacancyFileStat.size,
      });
      registeredArtifactIds.push(registered.id);
    }

    for (const artifact of preview.detectedArtifacts) {
      if (artifact.type === LegacyArtifactType.vacancy_source) {
        continue;
      }

      const contentHash = await this.hashFileBuffer(artifact.filePath);
      const stat = await fs.stat(artifact.filePath);

      const registered = await this.artifactsService.register({
        workspaceId: workspace.id,
        artifactType: artifact.type,
        canonicalFileName: path.basename(artifact.filePath),
        filePath: artifact.filePath,
        storageRoot: importRoot,
        contentHash,
        origin: 'imported',
        mimeType: LEGACY_ARTIFACT_MIME_TYPES[artifact.type],
        fileSizeBytes: stat.size,
      });
      registeredArtifactIds.push(registered.id);
    }

    return {
      workspaceId: workspace.id,
      companyId: company.id,
      jobVacancyId: vacancy.id,
      workspaceSlug,
      companySlug: preview.companySlug,
      roleSlug: preview.roleSlug,
      status: workspaceStatus,
      registeredArtifactIds,
    };
  }

  private resolveVacancySourcePath(
    candidates: string[],
    selected: string | undefined,
  ): string {
    if (candidates.length === 1) {
      return candidates[0];
    }

    if (candidates.length === 0) {
      throw new BadRequestException(
        'No vacancy source file found in this folder; nothing to import',
      );
    }

    if (!selected || !candidates.includes(selected)) {
      throw new BadRequestException(
        'Multiple vacancy source candidates found; selectedVacancySourcePath must be ' +
          'provided and must match one of them',
      );
    }

    return selected;
  }

  private async hashFileBuffer(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
  }

  private legacyDateForSlug(legacyDate: string): string {
    return legacyDate.slice(0, 10).replace(/-/g, '_');
  }

  private assertInsideImportRoot(
    resolvedPath: string,
    importRoot: string,
  ): void {
    const rootWithSep = importRoot.endsWith(path.sep)
      ? importRoot
      : importRoot + path.sep;
    if (resolvedPath !== importRoot && !resolvedPath.startsWith(rootWithSep)) {
      throw new BadRequestException(
        `folderPath "${resolvedPath}" is outside the configured IMPORT_ROOT`,
      );
    }
  }

  private async detectDuplicate(
    folderPath: string,
    vacancySourceCandidates: string[],
  ): Promise<{
    reason: ImportDuplicateReason;
    workspaceId: string;
  } | null> {
    const pathMatch = await this.prisma.applicationWorkspace.findFirst({
      where: { sourceImportedPath: folderPath },
      select: { id: true },
    });

    if (pathMatch) {
      return {
        reason: ImportDuplicateReason.source_path,
        workspaceId: pathMatch.id,
      };
    }

    if (vacancySourceCandidates.length !== 1) {
      return null;
    }

    const contentHash = await this.hashService.hashFile(
      vacancySourceCandidates[0],
    );

    const hashMatch = await this.prisma.generatedArtifact.findFirst({
      where: { artifactType: VACANCY_SOURCE_ARTIFACT_TYPE, contentHash },
      select: { workspaceId: true },
    });

    if (hashMatch) {
      return {
        reason: ImportDuplicateReason.content_hash,
        workspaceId: hashMatch.workspaceId,
      };
    }

    return null;
  }

  private async scanDateFolder(
    folderPath: string,
    companyNameOriginal: string,
    dateFolderName: string,
  ): Promise<ImportScanResultDto> {
    const companySlug =
      this.slugService.normalizeCompanySlug(companyNameOriginal);
    const fileNames = await this.listFiles(folderPath);

    const detectedArtifacts: DetectedLegacyArtifactDto[] = [];
    const vacancySourceCandidates: string[] = [];
    const warnings: string[] = [];

    let skipFileName: string | undefined;
    let hasTargetedCvContent = false;
    let hasCvPdf = false;
    let hasCoverLetter = false;

    for (const fileName of fileNames) {
      const filePath = path.join(folderPath, fileName);

      if (SKIP_REASON_PATTERN.test(fileName)) {
        detectedArtifacts.push({
          type: LegacyArtifactType.legacy_skip_reason_md,
          filePath,
        });
        skipFileName = fileName;
        continue;
      }

      if (TARGETED_CV_CONTENT_PATTERN.test(fileName)) {
        detectedArtifacts.push({
          type: LegacyArtifactType.legacy_targeted_cv_content_md,
          filePath,
        });
        hasTargetedCvContent = true;
        continue;
      }

      if (CV_PDF_PATTERN.test(fileName)) {
        detectedArtifacts.push({
          type: LegacyArtifactType.legacy_cv_pdf,
          filePath,
        });
        hasCvPdf = true;
        continue;
      }

      if (COVER_LETTER_PATTERN.test(fileName)) {
        detectedArtifacts.push({
          type: LegacyArtifactType.legacy_cover_letter_pdf,
          filePath,
        });
        hasCoverLetter = true;
        continue;
      }

      if (fileName.toLowerCase().endsWith('.txt')) {
        detectedArtifacts.push({
          type: LegacyArtifactType.vacancy_source,
          filePath,
        });
        vacancySourceCandidates.push(filePath);
      }
    }

    if (vacancySourceCandidates.length > 1) {
      warnings.push(
        `Multiple vacancy source candidates found (${vacancySourceCandidates.length}); user must choose one.`,
      );
    }

    let roleTitleOriginal: string | undefined;
    let roleSlug: string | undefined;
    let primaryVacancyFileName: string | undefined;

    if (vacancySourceCandidates.length === 1) {
      primaryVacancyFileName = path.basename(vacancySourceCandidates[0]);
      const { title, matchedCompanyPrefix } = this.extractRoleTitle(
        this.stripExtension(primaryVacancyFileName),
        companySlug,
      );
      roleTitleOriginal = title;
      roleSlug = this.slugService.normalizeRoleSlug(title);

      if (!matchedCompanyPrefix) {
        warnings.push(
          `Vacancy source file "${primaryVacancyFileName}" does not start with the company name "${companyNameOriginal}"; confirm company assignment.`,
        );
      }
    }

    if (skipFileName) {
      const skipRoleBase = this.stripExtension(skipFileName)
        .replace(SKIP_PREFIX_PATTERN, '')
        .replace(REASON_SUFFIX_PATTERN, '');
      const { title: skipRoleTitle } = this.extractRoleTitle(
        skipRoleBase,
        companySlug,
      );

      if (
        roleTitleOriginal &&
        skipRoleTitle &&
        skipRoleTitle !== roleTitleOriginal
      ) {
        warnings.push(
          `Role title differs between vacancy source ("${roleTitleOriginal}") and skip reason file ("${skipRoleTitle}"); user must confirm the final role title.`,
        );
      } else if (!roleTitleOriginal && skipRoleTitle) {
        roleTitleOriginal = skipRoleTitle;
        roleSlug = this.slugService.normalizeRoleSlug(skipRoleTitle);
      }
    }

    const { legacyDate, legacyDateConfidence } =
      this.parseLegacyDate(dateFolderName);

    return {
      folderPath,
      companyNameOriginal,
      companySlug,
      ...(roleTitleOriginal !== undefined ? { roleTitleOriginal } : {}),
      ...(roleSlug !== undefined ? { roleSlug } : {}),
      legacyDate,
      legacyDateConfidence,
      vacancySourceCandidates,
      detectedArtifacts,
      suggestedStatus: this.suggestStatus({
        hasSkip: !!skipFileName,
        hasCoverLetter,
        hasCvPdf,
        hasTargetedCvContent,
        hasVacancySource: vacancySourceCandidates.length > 0,
      }),
      warnings,
    };
  }

  private suggestStatus(flags: {
    hasSkip: boolean;
    hasCoverLetter: boolean;
    hasCvPdf: boolean;
    hasTargetedCvContent: boolean;
    hasVacancySource: boolean;
  }): ImportSuggestedStatus {
    if (flags.hasSkip) {
      return ImportSuggestedStatus.skipped;
    }
    if (flags.hasCoverLetter) {
      return ImportSuggestedStatus.cover_letter_generated;
    }
    if (flags.hasCvPdf) {
      return ImportSuggestedStatus.cv_pdf_generated;
    }
    if (flags.hasTargetedCvContent) {
      return ImportSuggestedStatus.cv_draft_ready;
    }
    if (flags.hasVacancySource) {
      return ImportSuggestedStatus.source_saved;
    }
    return ImportSuggestedStatus.import_needs_review;
  }

  private parseLegacyDate(dateFolderName: string): {
    legacyDate: string;
    legacyDateConfidence: 'high' | 'low';
  } {
    const match = DATE_FOLDER_PATTERN.exec(dateFolderName);
    if (match) {
      const [, year, month, day] = match;
      return {
        legacyDate: `${year}-${month}-${day}`,
        legacyDateConfidence: 'high',
      };
    }
    return {
      legacyDate: new Date().toISOString(),
      legacyDateConfidence: 'low',
    };
  }

  private extractRoleTitle(
    baseNameNoExt: string,
    companySlug: string,
  ): { title: string; matchedCompanyPrefix: boolean } {
    const prefixPattern = new RegExp(`^${companySlug}_`, 'i');
    let remainder = baseNameNoExt;
    let matchedCompanyPrefix = false;

    if (prefixPattern.test(remainder)) {
      remainder = remainder.replace(prefixPattern, '');
      matchedCompanyPrefix = true;
    }

    const title = remainder.replace(/_/g, ' ').trim();
    return { title, matchedCompanyPrefix };
  }

  private stripExtension(fileName: string): string {
    const ext = path.extname(fileName);
    return ext ? fileName.slice(0, -ext.length) : fileName;
  }

  private async listDirectories(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  private async listFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  }
}
