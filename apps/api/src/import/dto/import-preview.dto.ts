import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  DetectedLegacyArtifactDto,
  ImportSuggestedStatus,
} from './import-scan-result.dto';

export class ImportPreviewRequestDto {
  @ApiProperty({
    description:
      'Absolute path to a single scanned Company/YYYY.MM.DD folder, as returned by ' +
      'GET /import/scan (ImportScanResultDto.folderPath)',
  })
  @IsString()
  @IsNotEmpty()
  folderPath: string;

  @ApiPropertyOptional({
    description:
      'Manual correction for the inferred company name. When provided, companySlug in ' +
      'the response is recomputed from this value via SlugService instead of the ' +
      'folder-inferred company name.',
  })
  @IsOptional()
  @IsString()
  companyNameOverride?: string;

  @ApiPropertyOptional({
    description:
      'Manual correction for the inferred role title. When provided, roleSlug in the ' +
      'response is recomputed from this value via SlugService instead of the ' +
      'file-name-inferred role title.',
  })
  @IsOptional()
  @IsString()
  roleTitleOverride?: string;
}

export enum ImportDuplicateReason {
  source_path = 'source_path',
  content_hash = 'content_hash',
}

export class ImportPreviewResultDto {
  @ApiProperty({ description: 'Absolute path to the scanned date folder' })
  folderPath: string;

  @ApiProperty({
    description:
      'Company name used for this preview — the override if provided, otherwise the ' +
      'folder-inferred value',
  })
  companyNameOriginal: string;

  @ApiProperty({ description: 'Company slug derived via SlugService' })
  companySlug: string;

  @ApiPropertyOptional({
    description:
      'Role title used for this preview — the override if provided, otherwise the ' +
      'file-name-inferred value',
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
      'Absolute paths of candidate vacancy source .txt files (excludes SKIP_*.txt)',
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

  @ApiProperty({
    description:
      'True when this folder appears to already have been imported (matched by source ' +
      'path or vacancy content hash against an existing ApplicationWorkspace)',
  })
  isDuplicate: boolean;

  @ApiPropertyOptional({
    enum: ImportDuplicateReason,
    description: 'Which signal matched — only present when isDuplicate is true',
  })
  duplicateReason?: ImportDuplicateReason;

  @ApiPropertyOptional({
    description:
      'id of the existing ApplicationWorkspace this folder duplicates — only present ' +
      'when isDuplicate is true',
  })
  duplicateWorkspaceId?: string;
}
