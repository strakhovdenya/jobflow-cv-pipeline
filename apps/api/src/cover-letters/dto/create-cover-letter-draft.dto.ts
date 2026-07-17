import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCoverLetterDraftDto {
  @IsString()
  @MinLength(1)
  letterType: string;

  @IsOptional()
  @IsString()
  promptRunId?: string;
}
