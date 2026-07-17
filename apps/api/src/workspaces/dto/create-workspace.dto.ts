import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Original company name as written in the job ad',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyNameOriginal: string;

  @ApiProperty({
    description: 'Original role title as written in the job ad',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  roleTitleOriginal: string;

  @ApiProperty({ description: 'Full vacancy text to be saved and analyzed' })
  @IsString()
  @IsNotEmpty()
  vacancyText: string;

  @ApiProperty({
    description: 'URL of the original job posting',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}
