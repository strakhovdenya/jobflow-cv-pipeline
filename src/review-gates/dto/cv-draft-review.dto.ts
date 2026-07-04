import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CvDraftReviewAction {
  approve = 'approve',
  pause = 'pause',
  mark_not_worth_applying = 'mark_not_worth_applying',
}

export class CvDraftReviewDto {
  @IsEnum(CvDraftReviewAction)
  action: CvDraftReviewAction;

  @IsOptional()
  @IsString()
  reasonNote?: string;
}
