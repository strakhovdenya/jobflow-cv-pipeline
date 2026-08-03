import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum CvDraftReviewAction {
  approve = 'approve',
  pause = 'pause',
}

export class CvDraftReviewDto {
  @ApiProperty({
    enum: CvDraftReviewAction,
    description: 'Review decision action for the CV draft',
  })
  @IsEnum(CvDraftReviewAction)
  action: CvDraftReviewAction;
}
