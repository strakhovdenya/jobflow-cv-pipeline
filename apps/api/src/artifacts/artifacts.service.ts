import { Injectable } from '@nestjs/common';
import { GeneratedArtifact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RegisterArtifactDto {
  workspaceId: string;
  promptRunId?: string;
  artifactType: string;
  canonicalFileName: string;
  filePath: string;
  storageRoot: string;
  contentHash: string;
  isLatest?: boolean;
  origin: string;
  mimeType?: string;
  fileSizeBytes?: number;
  downloadFileName?: string;
}

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterArtifactDto): Promise<GeneratedArtifact> {
    const previousLatest = await this.prisma.generatedArtifact.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        artifactType: dto.artifactType,
        isLatest: true,
      },
      orderBy: { version: 'desc' },
    });

    if (previousLatest) {
      await this.prisma.generatedArtifact.updateMany({
        where: {
          workspaceId: dto.workspaceId,
          artifactType: dto.artifactType,
          isLatest: true,
        },
        data: { isLatest: false },
      });
    }

    const version = previousLatest ? previousLatest.version + 1 : 1;

    return this.prisma.generatedArtifact.create({
      data: {
        workspaceId: dto.workspaceId,
        promptRunId: dto.promptRunId ?? null,
        artifactType: dto.artifactType,
        canonicalFileName: dto.canonicalFileName,
        filePath: dto.filePath,
        storageRoot: dto.storageRoot,
        contentHash: dto.contentHash,
        isLatest: dto.isLatest ?? true,
        version,
        origin: dto.origin,
        mimeType: dto.mimeType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
        downloadFileName: dto.downloadFileName ?? null,
      },
    });
  }

  async findByWorkspaceId(workspaceId: string): Promise<GeneratedArtifact[]> {
    return this.prisma.generatedArtifact.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<GeneratedArtifact | null> {
    return this.prisma.generatedArtifact.findUnique({ where: { id } });
  }
}
