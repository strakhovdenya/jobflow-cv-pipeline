import { Injectable } from '@nestjs/common';
import { ApplicationWorkspace, Prisma, WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<Prisma.ApplicationWorkspaceCreateInput, 'status'>,
  ): Promise<ApplicationWorkspace> {
    return this.prisma.applicationWorkspace.create({
      data: { ...data, status: WorkspaceStatus.source_saved },
    });
  }

  async findById(id: string): Promise<ApplicationWorkspace | null> {
    return this.prisma.applicationWorkspace.findUnique({
      where: { id },
      include: { company: true, jobVacancy: true },
    });
  }
}
