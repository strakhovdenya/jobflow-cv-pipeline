import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

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
}
