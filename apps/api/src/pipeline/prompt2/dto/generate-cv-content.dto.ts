import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export const REGENERATION_NOTES_MAX_LENGTH = 20_000;

export class GenerateCvContentDto {
  @ApiPropertyOptional({
    description:
      'Optional user feedback to steer a regeneration of an existing CV draft (ignored on the first generation, since no previous draft exists yet)',
    maxLength: REGENERATION_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(REGENERATION_NOTES_MAX_LENGTH)
  notes?: string;
}
