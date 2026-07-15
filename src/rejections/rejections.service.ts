import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GeneratedArtifact, WorkspaceStatus } from '@prisma/client';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveRejectionTextDto } from './dto/save-rejection-text.dto';

const REJECTION_TEXT_VALID_STATUSES: WorkspaceStatus[] = [
  WorkspaceStatus.rejected,
];

@Injectable()
export class RejectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  async saveRejectionText(
    workspaceId: string,
    dto: SaveRejectionTextDto,
  ): Promise<GeneratedArtifact> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    if (!REJECTION_TEXT_VALID_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — cannot save rejection text ` +
          `(requires one of: ${REJECTION_TEXT_VALID_STATUSES.join(', ')})`,
      );
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const { filePath, hash } = await this.artifactStorage.writeFile(
      workspaceAbsPath,
      'rejection_feedback.md',
      dto.text,
    );

    return this.artifactsService.register({
      workspaceId,
      artifactType: 'rejection_feedback',
      canonicalFileName: 'rejection_feedback.md',
      filePath,
      storageRoot: workspace.storageRoot,
      contentHash: hash,
      origin: 'pasted',
      mimeType: 'text/markdown',
    });
  }
}
