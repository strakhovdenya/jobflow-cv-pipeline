import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  companyNameOriginal: string;

  @IsString()
  @IsNotEmpty()
  roleTitleOriginal: string;

  @IsString()
  @IsNotEmpty()
  vacancyText: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}
