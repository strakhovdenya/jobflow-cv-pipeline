import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
  VacancyDecision,
  WorkspaceStatus,
} from '@prisma/client';
import { CostEstimate } from '../../ai/pricing';
import { UsageBreakdown } from '../../ai/usage-breakdown';
import { OpenQuestion } from '../../pipeline/structured-analysis/analysis-decision.schema';
import {
  ComparisonActiveJob,
  ComparisonInputEquality,
  ComparisonMember,
  ComparisonStage,
  ComparisonStepError,
  ComparisonSummary,
  ComparisonTotals,
  InputEqualityFlag,
} from '../comparison-summary.service';
import { WorkspaceAnalysisPolicy } from '../workspaces.service';

// The Swagger models of `GET /workspaces/:id/comparison` and of the policy fields of the workspace
// detail (ADR-019, ISSUE-716). They describe the service results; they hold no logic.

export class UsageBreakdownDto implements UsageBreakdown {
  @ApiProperty({
    description:
      'false when no call has recorded provider usage; the counts are then 0 and mean "not measured", not zero usage',
  })
  isMeasured!: boolean;

  @ApiProperty({
    description: 'Whole input of the calls, cache reads and writes included',
  })
  inputTokens!: number;

  @ApiProperty({ description: 'Input tokens read from the prompt cache' })
  cacheReadTokens!: number;

  @ApiProperty({ description: 'Input tokens written to the prompt cache' })
  cacheWriteTokens!: number;

  @ApiProperty({ description: 'Output tokens, reasoning tokens included' })
  outputTokens!: number;

  @ApiProperty({ description: 'Reasoning tokens, a part of the output tokens' })
  reasoningTokens!: number;
}

export class CostEstimateDto implements CostEstimate {
  @ApiProperty({
    description: 'Always true: a list-price estimate, never an invoiced amount',
    enum: [true],
  })
  isEstimate!: true;

  @ApiProperty({ description: 'Label to show next to the amount' })
  label!: string;

  @ApiProperty({ description: 'Currency of the amount' })
  currency!: string;

  @ApiProperty({ description: 'Version of the pricing table used' })
  pricingVersion!: string;

  @ApiPropertyOptional({
    description:
      'Estimated amount; null when it cannot be estimated (never 0 for unknown)',
    type: Number,
    nullable: true,
  })
  amount!: number | null;

  @ApiPropertyOptional({
    description: 'Why there is no amount, or which calls the amount leaves out',
    type: String,
    nullable: true,
  })
  reason!: string | null;
}

export class ComparisonActiveJobDto implements ComparisonActiveJob {
  @ApiProperty({
    description:
      'BullMQ state of the open AI step job, "none" without one, "unknown" when the queue cannot be read',
  })
  state!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  jobId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  step!: string | null;
}

export class ComparisonStepErrorDto implements ComparisonStepError {
  @ApiProperty({ description: 'The step whose last attempt failed' })
  step!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  message!: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  at!: Date | null;
}

export class ComparisonStageDto implements ComparisonStage {
  @ApiProperty({
    description:
      'Analysis step key: prompt_1, analysis_b, analysis_x1 or analysis_x2',
  })
  stepKey!: string;

  @ApiProperty({
    description:
      'The stage result (01a) was carried over from the fork source; this workspace made no call for it',
  })
  isCarriedOver!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  carriedOverFromWorkspaceId!: string | null;

  @ApiProperty({
    description: 'Runs of the step, attempts without a call included',
  })
  promptRunCount!: number;

  @ApiProperty({
    description: 'Provider calls of the step (runs with an AiRun)',
  })
  callCount!: number;

  @ApiProperty({ description: 'Provider calls saved as failed' })
  failedCallCount!: number;

  @ApiProperty({ description: 'Provider calls without recorded usage' })
  unmeasuredCallCount!: number;

  @ApiProperty({
    description: 'Sum of the call durations (run start to saved AiRun), in ms',
  })
  durationMs!: number;

  @ApiProperty({
    type: [String],
    description: '<provider>/<model> of the calls',
  })
  models!: string[];

  @ApiProperty({ type: UsageBreakdownDto })
  usage!: UsageBreakdownDto;

  @ApiProperty({ type: CostEstimateDto })
  estimate!: CostEstimateDto;
}

export class ComparisonTotalsDto implements ComparisonTotals {
  @ApiProperty()
  callCount!: number;

  @ApiProperty()
  failedCallCount!: number;

  @ApiProperty()
  unmeasuredCallCount!: number;

  @ApiProperty({ description: 'In ms' })
  durationMs!: number;

  @ApiProperty({ type: UsageBreakdownDto })
  usage!: UsageBreakdownDto;

  @ApiProperty({ type: CostEstimateDto })
  estimate!: CostEstimateDto;
}

export class OpenQuestionDto implements OpenQuestion {
  @ApiProperty()
  condition!: string;

  @ApiProperty()
  note!: string;
}

export class WorkspaceAnalysisPolicyDto implements WorkspaceAnalysisPolicy {
  @ApiProperty({
    description: 'Decision of the deterministic policy',
    enum: ['apply', 'maybe', 'skip'],
  })
  decision!: WorkspaceAnalysisPolicy['decision'];

  @ApiProperty()
  score!: number;

  @ApiProperty({
    description: 'The model’s own decision; advisory only',
    enum: ['apply', 'maybe', 'skip'],
  })
  advisoryDecision!: WorkspaceAnalysisPolicy['advisoryDecision'];

  @ApiProperty()
  advisoryDiffers!: boolean;

  @ApiProperty()
  borderline!: boolean;

  @ApiProperty({ type: [String] })
  borderlineReasons!: string[];

  @ApiProperty({ description: 'manual_review_required of 01c' })
  manualReviewRequired!: boolean;

  @ApiProperty({ description: 'Id of the policy row that decided' })
  decidingRule!: WorkspaceAnalysisPolicy['decidingRule'];

  @ApiProperty({ type: [OpenQuestionDto] })
  openQuestions!: OpenQuestionDto[];

  @ApiProperty()
  policyVersion!: string;
}

export class ComparisonMemberDto implements ComparisonMember {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  workspaceSlug!: string;

  @ApiProperty({ description: 'The workspace the summary was requested for' })
  isRequested!: boolean;

  @ApiProperty({ description: 'The workspace whose id is the group id' })
  isGroupRoot!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  forkedFromWorkspaceId!: string | null;

  @ApiProperty({ enum: AnalysisStrategy })
  analysisStrategy!: AnalysisStrategy;

  @ApiProperty({ enum: ContextLayout })
  contextLayout!: ContextLayout;

  @ApiProperty({ enum: ContextSourceSet })
  contextSourceSet!: ContextSourceSet;

  @ApiProperty({ description: 'The fork holds a carried-over 01a' })
  carryOverRequirements!: boolean;

  @ApiProperty({ enum: WorkspaceStatus })
  status!: WorkspaceStatus;

  @ApiProperty()
  isArchived!: boolean;

  @ApiProperty({ type: ComparisonActiveJobDto })
  activeJob!: ComparisonActiveJobDto;

  @ApiPropertyOptional({ type: ComparisonStepErrorDto, nullable: true })
  lastStepError!: ComparisonStepErrorDto | null;

  @ApiPropertyOptional({ enum: VacancyDecision, nullable: true })
  currentDecision!: VacancyDecision | null;

  @ApiPropertyOptional({ enum: VacancyDecision, nullable: true })
  originalDecision!: VacancyDecision | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  score!: number | null;

  @ApiPropertyOptional({ type: WorkspaceAnalysisPolicyDto, nullable: true })
  analysisPolicy!: WorkspaceAnalysisPolicyDto | null;

  @ApiProperty({ type: [ComparisonStageDto] })
  stages!: ComparisonStageDto[];

  @ApiProperty({ type: ComparisonTotalsDto })
  totals!: ComparisonTotalsDto;
}

export class InputEqualityFlagDto implements InputEqualityFlag {
  @ApiProperty({ description: 'false when two recorded values differ' })
  isEqual!: boolean;

  @ApiProperty({
    type: [String],
    description: 'Members whose value is not recorded, so not compared',
  })
  unrecordedWorkspaceIds!: string[];
}

export class ComparisonInputEqualityDto implements ComparisonInputEquality {
  @ApiProperty({ type: InputEqualityFlagDto })
  vacancyHash!: InputEqualityFlagDto;

  @ApiProperty({ type: InputEqualityFlagDto })
  companyAndRole!: InputEqualityFlagDto;

  @ApiProperty({
    type: InputEqualityFlagDto,
    description: 'Notes the analysis read (the stored notes before it ran)',
  })
  notes!: InputEqualityFlagDto;

  @ApiProperty({
    type: InputEqualityFlagDto,
    description: 'Source ids and hashes the analysis recorded',
  })
  snapshot!: InputEqualityFlagDto;

  @ApiProperty({
    type: InputEqualityFlagDto,
    description: 'Provider and model of the calls that produced the analysis',
  })
  model!: InputEqualityFlagDto;
}

export class ComparisonSummaryDto implements ComparisonSummary {
  @ApiProperty()
  workspaceId!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  comparisonGroupId!: string | null;

  @ApiProperty({ type: [ComparisonMemberDto] })
  members!: ComparisonMemberDto[];

  @ApiProperty({ type: ComparisonInputEqualityDto })
  inputEquality!: ComparisonInputEqualityDto;
}
