import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  AnalysisStrategy,
  ContextLayout,
  ContextSourceSet,
} from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { ApplicationTrackingService } from '../application-tracking/application-tracking.service';
import { MarkAppliedDto } from '../application-tracking/dto/mark-applied.dto';
import { MarkRejectedDto } from '../application-tracking/dto/mark-rejected.dto';
import { AiStepThrottle } from '../config/throttler.config';
import { AiStepsService } from '../queue/ai-steps.service';
import { RejectionsService } from '../rejections/rejections.service';
import { SaveRejectionTextDto } from '../rejections/dto/save-rejection-text.dto';
import { ReviewGatesService } from '../review-gates/review-gates.service';
import { SubmitDecisionDto } from '../review-gates/dto/submit-decision.dto';
import { OverrideSkipDto } from '../review-gates/dto/override-skip.dto';
import { CvDraftReviewDto } from '../review-gates/dto/cv-draft-review.dto';
import { GenerateCvContentDto } from '../pipeline/prompt2/dto/generate-cv-content.dto';
import { ComparisonSummaryService } from './comparison-summary.service';
import { AppendManualNoteDto } from './dto/append-manual-note.dto';
import {
  ComparisonSummaryDto,
  WorkspaceAnalysisPolicyDto,
} from './dto/comparison-summary.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
  ForkWorkspaceDto,
  ForkWorkspaceResultDto,
} from './dto/fork-workspace.dto';
import { WorkspaceForkService } from './workspace-fork.service';
import {
  WorkspaceDetailResult,
  WorkspacesService,
  WorkspaceWithRelations,
} from './workspaces.service';

const toPublicWorkspace = (workspace: WorkspaceWithRelations) => ({
  id: workspace.id,
  companyId: workspace.companyId,
  jobVacancyId: workspace.jobVacancyId,
  workspaceSlug: workspace.workspaceSlug,
  status: workspace.status,
  currentDecision: workspace.currentDecision,
  originalDecision: workspace.originalDecision,
  reviewState: workspace.reviewState,
  score: workspace.score,
  skipReasonSummary: workspace.skipReasonSummary,
  nextRecommendedAction: workspace.nextRecommendedAction,
  isSkipped: workspace.isSkipped,
  isArchived: workspace.isArchived,
  createdFrom: workspace.createdFrom,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
  lastActivityAt: workspace.lastActivityAt,
  appliedAt: workspace.appliedAt,
  appliedVia: workspace.appliedVia,
  rejectedAt: workspace.rejectedAt,
  rejectionSummary: workspace.rejectionSummary,
  notes: workspace.notes,
  submittedCvArtifactId: workspace.submittedCvArtifactId,
  submittedCoverLetterArtifactId: workspace.submittedCoverLetterArtifactId,
  lastStepErrorStep: workspace.lastStepErrorStep,
  lastStepErrorMessage: workspace.lastStepErrorMessage,
  lastStepErrorAt: workspace.lastStepErrorAt,
  analysisStrategy: workspace.analysisStrategy,
  contextLayout: workspace.contextLayout,
  contextSourceSet: workspace.contextSourceSet,
  forkedFromWorkspaceId: workspace.forkedFromWorkspaceId,
  comparisonGroupId: workspace.comparisonGroupId,
  company: workspace.company,
  jobVacancy: workspace.jobVacancy,
});

// The ADR-046 item 13 field of the workspace detail (ISSUE-715); the other fields of the response
// are not described by a Swagger model yet.
export class WorkspaceSourcesStatusDto {
  @ApiProperty({
    description:
      'true when the active knowledge sources differ (id or content hash) from the ones the experimental analysis was pinned to, or that snapshot cannot be read; false for a legacy workspace or one without a completed analysis',
  })
  sourcesChangedSinceAnalysis!: boolean;
}

// The ADR-046 fields of the workspace detail (ISSUE-716): strategy, context profile, fork link and
// the policy result of the latest experimental analysis. Passed through as stored; the controller
// does not branch on the strategy.
export class WorkspaceExperimentDetailDto extends WorkspaceSourcesStatusDto {
  @ApiProperty({ enum: AnalysisStrategy })
  analysisStrategy!: AnalysisStrategy;

  @ApiProperty({ enum: ContextLayout })
  contextLayout!: ContextLayout;

  @ApiProperty({ enum: ContextSourceSet })
  contextSourceSet!: ContextSourceSet;

  @ApiPropertyOptional({
    description: 'The workspace this one was forked from',
    type: String,
    nullable: true,
  })
  forkedFromWorkspaceId!: string | null;

  @ApiPropertyOptional({
    description: 'The comparison group of the forks of one source',
    type: String,
    nullable: true,
  })
  comparisonGroupId!: string | null;

  @ApiPropertyOptional({
    description:
      'Policy result read from the 01c of the latest experimental analysis; absent for a legacy workspace and when no valid 01c of the latest analysis can be read',
    type: WorkspaceAnalysisPolicyDto,
  })
  analysisPolicy?: WorkspaceAnalysisPolicyDto;
}

const toPublicWorkspaceDetail = (workspace: WorkspaceDetailResult) => ({
  ...toPublicWorkspace(workspace),
  artifacts: workspace.artifacts,
  manualNotes: workspace.manualNotes,
  manualNoteForcedClaims: workspace.manualNoteForcedClaims,
  manualNoteForcedClaimsUnreadable: workspace.manualNoteForcedClaimsUnreadable,
  sourcesChangedSinceAnalysis: workspace.sourcesChangedSinceAnalysis,
  ...(workspace.analysisPolicy
    ? { analysisPolicy: workspace.analysisPolicy }
    : {}),
});

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspacesController {
  private readonly logger = new Logger(WorkspacesController.name);

  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly reviewGatesService: ReviewGatesService,
    private readonly applicationTrackingService: ApplicationTrackingService,
    private readonly rejectionsService: RejectionsService,
    private readonly aiStepsService: AiStepsService,
    private readonly workspaceForkService: WorkspaceForkService,
    private readonly comparisonSummaryService: ComparisonSummaryService,
  ) {}

  @ApiOperation({ summary: 'Create a new application workspace' })
  @Post()
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.createWorkspace(dto);
  }

  @ApiOperation({
    summary:
      'List all application workspaces (storage paths are not part of the response)',
  })
  @Get()
  async findAll() {
    const workspaces = await this.workspacesService.findAll();
    return workspaces.map(toPublicWorkspace);
  }

  @ApiOperation({
    summary:
      'Get an application workspace by id, including status, decision, score and artifact summary (storage paths are not part of the response)',
  })
  @ApiOkResponse({
    description:
      'The workspace detail; sourcesChangedSinceAnalysis flags an experimental analysis whose pinned sources are no longer the active ones',
    type: WorkspaceExperimentDetailDto,
  })
  @Get(':id')
  async findById(@Param('id') id: string) {
    const workspace = await this.workspacesService.getWorkspaceDetail(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }
    return {
      ...toPublicWorkspaceDetail(workspace),
      activeJob: await this.findActiveJobSafely(id),
    };
  }

  @ApiOperation({
    summary:
      'Fork a workspace into a new workspace of the same vacancy with its own analysis strategy and context profile (ADR-046 item 8); nothing is enqueued',
  })
  @ApiCreatedResponse({
    description:
      'The fork, or the fork an earlier request with the same requestKey created (isNew: false); 409 when that key was used with other options',
    type: ForkWorkspaceResultDto,
  })
  @Post(':id/fork')
  async fork(@Param('id') id: string, @Body() dto: ForkWorkspaceDto) {
    return this.workspaceForkService.fork(id, dto);
  }

  @ApiOperation({
    summary:
      'Read-only comparison summary of the workspace and the other members of its fork group: status, active job, decisions, policy flags, per-stage token usage, durations, call counts, a labelled list-price estimate and input-equality flags',
  })
  @ApiOkResponse({ type: ComparisonSummaryDto })
  @Get(':id/comparison')
  async comparison(@Param('id') id: string) {
    return this.comparisonSummaryService.buildSummary(id);
  }

  @ApiOperation({
    summary:
      'Enqueue Prompt 1 vacancy analysis as a background job; poll GET :id/jobs/:jobId',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @AiStepThrottle()
  @Post(':id/run-analysis')
  async runAnalysis(@Param('id') id: string) {
    return this.aiStepsService.enqueue('prompt_1', id);
  }

  @ApiOperation({
    summary:
      'Get the status and result of a background AI step job of this workspace',
  })
  @SkipThrottle()
  @Get(':id/jobs/:jobId')
  async getJob(@Param('id') id: string, @Param('jobId') jobId: string) {
    return this.aiStepsService.getJob(id, jobId);
  }

  @ApiOperation({
    summary:
      'Enqueue targeted CV content generation (Prompt 2) or a regenerate of an existing draft with optional user feedback, as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @AiStepThrottle()
  @Post(':id/generate-cv-content')
  async generateCvContent(
    @Param('id') id: string,
    @Body() dto: GenerateCvContentDto,
  ) {
    // dto is undefined (not {}) when the client sends no body at all — e.g. the original
    // "Generate CV draft" call, and every pre-ADR-029 caller of this endpoint.
    return this.aiStepsService.enqueue('prompt_2', id, dto?.notes);
  }

  @ApiOperation({
    summary:
      'Enqueue the optional Prompt 3 pre-PDF safety check on the approved CV draft as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @AiStepThrottle()
  @Post(':id/run-pre-pdf-check')
  async runPrePdfCheck(@Param('id') id: string) {
    return this.aiStepsService.enqueue('prompt_3', id);
  }

  @ApiOperation({
    summary:
      'Enqueue the optional Prompt 5 final check on the fully exported CV output as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @AiStepThrottle()
  @Post(':id/run-final-check')
  async runFinalCheck(@Param('id') id: string) {
    return this.aiStepsService.enqueue('prompt_5', id);
  }

  @ApiOperation({
    summary:
      'Enqueue a targeted cover letter after the CV has been PDF-exported, as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @AiStepThrottle()
  @Post(':id/generate-cover-letter')
  async generateCoverLetter(@Param('id') id: string) {
    return this.aiStepsService.enqueue('cover_letter', id);
  }

  // The detail view must stay readable when Redis is down or not configured: a missing queue
  // only means there is no observable background job, so it is logged and reported as none.
  private async findActiveJobSafely(id: string) {
    try {
      return await this.aiStepsService.findActiveJob(id);
    } catch (error) {
      this.logger.warn(
        `Could not read the active background job of workspace "${id}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  @ApiOperation({
    summary: 'Submit an apply/maybe/pause/skip review decision',
  })
  @Post(':id/review-decision')
  async reviewDecision(
    @Param('id') id: string,
    @Body() dto: SubmitDecisionDto,
  ) {
    return this.reviewGatesService.submitDecision(
      id,
      dto.action,
      dto.reasonNote,
    );
  }

  @ApiOperation({
    summary:
      'Enqueue confirming a skip decision and writing the skip reason, as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @AiStepThrottle()
  @Post(':id/confirm-skip')
  async confirmSkip(@Param('id') id: string) {
    return this.aiStepsService.enqueue('skip_reason', id);
  }

  @ApiOperation({
    summary: 'Override a skip decision back to apply or maybe',
  })
  @Post(':id/override-skip')
  async overrideSkip(@Param('id') id: string, @Body() dto: OverrideSkipDto) {
    return this.reviewGatesService.overrideSkip(id, dto);
  }

  @ApiOperation({ summary: 'Submit a review decision on the CV draft' })
  @Post(':id/review-cv-draft')
  async reviewCvDraft(@Param('id') id: string, @Body() dto: CvDraftReviewDto) {
    return this.reviewGatesService.submitCvDraftReview(id, dto.action);
  }

  @ApiOperation({
    summary:
      'Skip the optional Prompt 3 pre-PDF check and proceed straight to export',
  })
  @Post(':id/skip-pre-pdf-check')
  async skipPrePdfCheck(@Param('id') id: string) {
    return this.reviewGatesService.skipPrePdfCheck(id);
  }

  @ApiOperation({
    summary:
      'Mark a workspace ready to apply, after CV export or optional cover letter/final check',
  })
  @Post(':id/mark-ready-to-apply')
  async markReadyToApply(@Param('id') id: string) {
    return this.applicationTrackingService.markReadyToApply(id);
  }

  @ApiOperation({ summary: 'Mark a workspace as applied' })
  @Post(':id/mark-applied')
  async markApplied(@Param('id') id: string, @Body() dto: MarkAppliedDto) {
    return this.applicationTrackingService.markApplied(id, dto);
  }

  @ApiOperation({ summary: 'Mark an applied workspace as rejected' })
  @Post(':id/mark-rejected')
  async markRejected(@Param('id') id: string, @Body() dto: MarkRejectedDto) {
    return this.applicationTrackingService.markRejected(id, dto);
  }

  @ApiOperation({ summary: 'Archive a workspace' })
  @Post(':id/archive')
  async archive(@Param('id') id: string) {
    return this.applicationTrackingService.markArchived(id);
  }

  @ApiOperation({
    summary:
      'Save the full rejection text (e.g. recruiter email) as an artifact for a rejected workspace',
  })
  @Post(':id/rejection-text')
  async saveRejectionText(
    @Param('id') id: string,
    @Body() dto: SaveRejectionTextDto,
  ) {
    return this.rejectionsService.saveRejectionText(id, dto);
  }

  @ApiOperation({
    summary:
      'Create a new manual note (its own ManualNote row) for a workspace, available at any pipeline stage',
  })
  @Post(':id/manual-note')
  async appendManualNote(
    @Param('id') id: string,
    @Body() dto: AppendManualNoteDto,
  ) {
    return this.workspacesService.appendManualNote(id, dto.note);
  }
}
