import { IsEnum } from 'class-validator';

export enum ReviewAction {
  approve_apply = 'approve_apply',
  approve_maybe = 'approve_maybe',
  pause = 'pause',
  change_to_skip = 'change_to_skip',
}

export class SubmitDecisionDto {
  @IsEnum(ReviewAction)
  action: ReviewAction;
}
