import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkAppliedDto {
  @ApiPropertyOptional({
    description:
      'Channel the application was submitted through (e.g. LinkedIn, company site)',
  })
  @IsOptional()
  @IsString()
  appliedVia?: string;

  @ApiPropertyOptional({ description: 'Free-text notes about the application' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'GeneratedArtifact id of the CV PDF that was actually submitted',
  })
  @IsOptional()
  @IsString()
  submittedCvArtifactId?: string;

  @ApiPropertyOptional({
    description:
      'GeneratedArtifact id of the cover letter PDF that was actually submitted, if any',
  })
  @IsOptional()
  @IsString()
  submittedCoverLetterArtifactId?: string;
}
