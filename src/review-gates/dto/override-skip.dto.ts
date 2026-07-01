import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum OverrideTargetDecision {
  apply = 'apply',
  maybe = 'maybe',
}

export class OverrideSkipDto {
  @IsEnum(OverrideTargetDecision)
  targetDecision: OverrideTargetDecision;

  @IsOptional()
  @IsString()
  reasonNote?: string;
}
