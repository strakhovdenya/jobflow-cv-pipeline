import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Original company name as written in the job ad',
  })
  @IsString()
  @IsNotEmpty()
  companyNameOriginal: string;

  @ApiProperty({ description: 'Original role title as written in the job ad' })
  @IsString()
  @IsNotEmpty()
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
