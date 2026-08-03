import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewAction {
  approve_apply = 'approve_apply',
  approve_maybe = 'approve_maybe',
  pause = 'pause',
  change_to_skip = 'change_to_skip',
  override_to_apply = 'override_to_apply',
}

export class SubmitDecisionDto {
  @ApiProperty({ enum: ReviewAction, description: 'Review decision action' })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiProperty({
    description:
      'Optional note explaining the override (only meaningful for override_to_apply)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reasonNote?: string;
}
