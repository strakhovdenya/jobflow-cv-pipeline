import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkRejectedDto {
  @ApiPropertyOptional({
    description: 'Summary of the rejection reason, if known',
  })
  @IsOptional()
  @IsString()
  rejectionSummary?: string;

  @ApiPropertyOptional({ description: 'Free-text notes about the rejection' })
  @IsOptional()
  @IsString()
  notes?: string;
}
