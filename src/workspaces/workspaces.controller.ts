import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prompt1Service } from '../pipeline/prompt1/prompt1.service';
import { Prompt2Service } from '../pipeline/prompt2/prompt2.service';
import { SkipReasonService } from '../pipeline/skip/skip-reason.service';
import { ReviewGatesService } from '../review-gates/review-gates.service';
import { SubmitDecisionDto } from '../review-gates/dto/submit-decision.dto';
import { OverrideSkipDto } from '../review-gates/dto/override-skip.dto';
import { CvDraftReviewDto } from '../review-gates/dto/cv-draft-review.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly prompt1Service: Prompt1Service,
    private readonly prompt2Service: Prompt2Service,
    private readonly reviewGatesService: ReviewGatesService,
    private readonly skipReasonService: SkipReasonService,
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

  @ApiOperation({ summary: 'Get an application workspace by id' })
  @Get(':id')
  async findById(@Param('id') id: string) {
    const workspace = await this.workspacesService.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }
    return workspace;
  }

  @ApiOperation({ summary: 'Run Prompt 1 vacancy analysis for a workspace' })
  @Post(':id/run-analysis')
  async runAnalysis(@Param('id') id: string) {
    return this.prompt1Service.runAnalysis(id);
  }

  @ApiOperation({ summary: 'Generate targeted CV content via Prompt 2' })
  @Post(':id/generate-cv-content')
  async generateCvContent(@Param('id') id: string) {
    return this.prompt2Service.generateCvContent(id);
  }

  @ApiOperation({
    summary: 'Submit an apply/maybe/pause/skip review decision',
  })
  @Post(':id/review-decision')
  async reviewDecision(
    @Param('id') id: string,
    @Body() dto: SubmitDecisionDto,
  ) {
    return this.reviewGatesService.submitDecision(id, dto.action);
  }

  @ApiOperation({ summary: 'Confirm a skip decision and write skip reason' })
  @Post(':id/confirm-skip')
  async confirmSkip(@Param('id') id: string) {
    return this.skipReasonService.confirmSkip(id);
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
    return this.reviewGatesService.submitCvDraftReview(
      id,
      dto.action,
      dto.reasonNote,
    );
  }
}
