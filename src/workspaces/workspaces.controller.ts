import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { Prompt1Service } from '../pipeline/prompt1/prompt1.service';
import { SkipReasonService } from '../pipeline/skip/skip-reason.service';
import { ReviewGatesService } from '../review-gates/review-gates.service';
import { SubmitDecisionDto } from '../review-gates/dto/submit-decision.dto';
import { OverrideSkipDto } from '../review-gates/dto/override-skip.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly prompt1Service: Prompt1Service,
    private readonly reviewGatesService: ReviewGatesService,
    private readonly skipReasonService: SkipReasonService,
  ) {}

  @Post()
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.createWorkspace(dto);
  }

  @Get()
  async findAll() {
    return this.workspacesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const workspace = await this.workspacesService.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace "${id}" not found`);
    }
    return workspace;
  }

  @Post(':id/run-analysis')
  async runAnalysis(@Param('id') id: string) {
    return this.prompt1Service.runAnalysis(id);
  }

  @Post(':id/review-decision')
  async reviewDecision(
    @Param('id') id: string,
    @Body() dto: SubmitDecisionDto,
  ) {
    return this.reviewGatesService.submitDecision(id, dto.action);
  }

  @Post(':id/confirm-skip')
  async confirmSkip(@Param('id') id: string) {
    return this.skipReasonService.confirmSkip(id);
  }

  @Post(':id/override-skip')
  async overrideSkip(@Param('id') id: string, @Body() dto: OverrideSkipDto) {
    return this.reviewGatesService.overrideSkip(id, dto);
  }
}
