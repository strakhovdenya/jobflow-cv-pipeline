import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImportConfirmRequestDto {
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
      'Manual correction for the inferred company name (same semantics as ' +
      'ImportPreviewRequestDto.companyNameOverride)',
  })
  @IsOptional()
  @IsString()
  companyNameOverride?: string;

  @ApiPropertyOptional({
    description:
      'Manual correction for the inferred role title (same semantics as ' +
      'ImportPreviewRequestDto.roleTitleOverride)',
  })
  @IsOptional()
  @IsString()
  roleTitleOverride?: string;

  @ApiPropertyOptional({
    description:
      'Required when the folder has zero or more than one vacancy source .txt ' +
      'candidate (see ImportPreviewResultDto.vacancySourceCandidates/warnings) — must ' +
      'be one of the candidate paths.',
  })
  @IsOptional()
  @IsString()
  selectedVacancySourcePath?: string;

  @ApiPropertyOptional({
    description:
      'When true, physically copies the selected vacancy source into ' +
      '00_vacancy_source.txt under the new workspace folder (STORAGE_ROOT) and ' +
      'registers that copy with the canonical name instead of the legacy one. All ' +
      'other legacy artifacts (CV PDF, cover letter, targeted CV content, skip reason) ' +
      'are always registered in place, never copied. Default: false.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  copyVacancySourceToCanonical?: boolean;
}

export class ImportConfirmResultDto {
  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  jobVacancyId: string;

  @ApiProperty()
  workspaceSlug: string;

  @ApiProperty()
  companySlug: string;

  @ApiProperty()
  roleSlug: string;

  @ApiProperty({
    description: 'Initial WorkspaceStatus, mapped from suggestedStatus',
  })
  status: string;

  @ApiProperty({ type: [String] })
  registeredArtifactIds: string[];
}
