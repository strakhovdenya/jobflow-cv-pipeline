import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum OverrideTargetDecision {
  apply = 'apply',
  maybe = 'maybe',
}

export class OverrideSkipDto {
  @ApiProperty({
    enum: OverrideTargetDecision,
    description: 'Decision to override the skip to',
  })
  @IsEnum(OverrideTargetDecision)
  targetDecision: OverrideTargetDecision;

  @ApiProperty({
    description: 'Optional note explaining the manual override',
    required: false,
  })
  @IsOptional()
  @IsString()
  reasonNote?: string;
}
