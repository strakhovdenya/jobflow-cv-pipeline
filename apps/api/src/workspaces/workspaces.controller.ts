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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationTrackingService } from '../application-tracking/application-tracking.service';
import { MarkAppliedDto } from '../application-tracking/dto/mark-applied.dto';
import { MarkRejectedDto } from '../application-tracking/dto/mark-rejected.dto';
import { AiStepsService } from '../queue/ai-steps.service';
import { RejectionsService } from '../rejections/rejections.service';
import { SaveRejectionTextDto } from '../rejections/dto/save-rejection-text.dto';
import { ReviewGatesService } from '../review-gates/review-gates.service';
import { SubmitDecisionDto } from '../review-gates/dto/submit-decision.dto';
import { OverrideSkipDto } from '../review-gates/dto/override-skip.dto';
import { CvDraftReviewDto } from '../review-gates/dto/cv-draft-review.dto';
import { GenerateCvContentDto } from '../pipeline/prompt2/dto/generate-cv-content.dto';
import { AppendManualNoteDto } from './dto/append-manual-note.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

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
  ) {}

  @ApiOperation({ summary: 'Create a new application workspace' })
  @Post()
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.createWorkspace(dto);
  }

  @ApiOperation({ summary: 'List all application workspaces' })
  @Get()
  async findAll() {
    return this.workspacesService.findAll();
  }

  @ApiOperation({
    summary:
      'Get an application workspace by id, including status, decision, score and artifact summary',
  })
  @Get(':id')
  async findById(@Param('id') id: string) {
    const workspace = await this.workspacesService.getWorkspaceDetail(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }
    return { ...workspace, activeJob: await this.findActiveJobSafely(id) };
  }

  @ApiOperation({
    summary:
      'Enqueue Prompt 1 vacancy analysis as a background job; poll GET :id/jobs/:jobId',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/run-analysis')
  async runAnalysis(@Param('id') id: string) {
    return this.aiStepsService.enqueue('prompt_1', id);
  }

  @ApiOperation({
    summary:
      'Get the status and result of a background AI step job of this workspace',
  })
  @Get(':id/jobs/:jobId')
  async getJob(@Param('id') id: string, @Param('jobId') jobId: string) {
    return this.aiStepsService.getJob(id, jobId);
  }

  @ApiOperation({
    summary:
      'Enqueue targeted CV content generation (Prompt 2) or a regenerate of an existing draft with optional user feedback, as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
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
  @Post(':id/run-pre-pdf-check')
  async runPrePdfCheck(@Param('id') id: string) {
    return this.aiStepsService.enqueue('prompt_3', id);
  }

  @ApiOperation({
    summary:
      'Enqueue the optional Prompt 5 final check on the fully exported CV output as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/run-final-check')
  async runFinalCheck(@Param('id') id: string) {
    return this.aiStepsService.enqueue('prompt_5', id);
  }

  @ApiOperation({
    summary:
      'Enqueue a targeted cover letter after the CV has been PDF-exported, as a background job',
  })
  @HttpCode(HttpStatus.ACCEPTED)
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
