import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LegacyArtifactType {
  vacancy_source = 'vacancy_source',
  legacy_targeted_cv_content_md = 'legacy_targeted_cv_content_md',
  legacy_cv_pdf = 'legacy_cv_pdf',
  legacy_cover_letter_pdf = 'legacy_cover_letter_pdf',
  legacy_skip_reason_md = 'legacy_skip_reason_md',
}

export enum ImportSuggestedStatus {
  skipped = 'skipped',
  cover_letter_generated = 'cover_letter_generated',
  cv_pdf_generated = 'cv_pdf_generated',
  cv_draft_ready = 'cv_draft_ready',
  source_saved = 'source_saved',
  import_needs_review = 'import_needs_review',
}

export class DetectedLegacyArtifactDto {
  @ApiProperty({ enum: LegacyArtifactType })
  type: LegacyArtifactType;

  @ApiProperty({ description: 'Absolute path to the detected file on disk' })
  filePath: string;
}

export class ImportScanResultDto {
  @ApiProperty({ description: 'Absolute path to the scanned date folder' })
  folderPath: string;

  @ApiProperty({
    description: 'Company name inferred from the parent folder name',
  })
  companyNameOriginal: string;

  @ApiProperty({ description: 'Company slug derived via SlugService' })
  companySlug: string;

  @ApiPropertyOptional({
    description:
      'Role title inferred from the vacancy source (or skip reason) file name, ' +
      'with the company prefix stripped and underscores replaced by spaces',
  })
  roleTitleOriginal?: string;

  @ApiPropertyOptional({ description: 'Role slug derived via SlugService' })
  roleSlug?: string;

  @ApiPropertyOptional({
    description:
      'Legacy application date parsed from the YYYY.MM.DD folder name (ISO 8601)',
  })
  legacyDate?: string;

  @ApiProperty({
    enum: ['high', 'low'],
    description: 'high when the date folder name parsed cleanly, low otherwise',
  })
  legacyDateConfidence: 'high' | 'low';

  @ApiProperty({
    type: [String],
    description:
      'Absolute paths of candidate vacancy source .txt files (excludes SKIP_*.txt). ' +
      'More than one entry means the caller must ask the user to choose.',
  })
  vacancySourceCandidates: string[];

  @ApiProperty({ type: [DetectedLegacyArtifactDto] })
  detectedArtifacts: DetectedLegacyArtifactDto[];

  @ApiProperty({ enum: ImportSuggestedStatus })
  suggestedStatus: ImportSuggestedStatus;

  @ApiProperty({
    type: [String],
    description:
      'Human-readable warnings about ambiguous or conflicting detections that require manual review',
  })
  warnings: string[];
}
