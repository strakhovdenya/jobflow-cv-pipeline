import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CvDraftReviewAction {
  approve = 'approve',
  pause = 'pause',
  mark_not_worth_applying = 'mark_not_worth_applying',
}

export class CvDraftReviewDto {
  @ApiProperty({
    enum: CvDraftReviewAction,
    description: 'Review decision action for the CV draft',
  })
  @IsEnum(CvDraftReviewAction)
  action: CvDraftReviewAction;

  @ApiProperty({
    description: 'Optional note explaining the review decision',
    required: false,
  })
  @IsOptional()
  @IsString()
  reasonNote?: string;
}
