import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HashService } from '../artifacts/hash.service';
import { SlugService } from '../common/slug/slug.service';
import { PrismaService } from '../prisma/prisma.service';
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

export interface ImportPreviewOverrides {
  companyNameOverride?: string;
  roleTitleOverride?: string;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly slugService: SlugService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
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
