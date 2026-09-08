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
    // Two separate lookups, deliberately not conflated: `previousLatest` (isLatest: true) decides
    // whether an updateMany is needed to demote the currently-active row; `mostRecentVersion`
    // (highest version ever recorded for this type, regardless of isLatest) decides the next
    // version number. These can diverge — e.g. ISSUE-363's markNonLatest() demotes a stale
    // pre_pdf_check_* artifact to isLatest: false *before* any replacement is registered (to close
    // a real correctness gap: a skipped, never-rerun pre-PDF check must stop being surfaced as
    // valid). If version were computed from `previousLatest` alone, the next register() of that
    // same artifactType would find nothing isLatest and silently reset numbering back to v1,
    // discarding real version history. Computing it from the max version instead keeps numbering
    // continuous no matter what flipped isLatest off in between.
    const [previousLatest, mostRecentVersion] = await Promise.all([
      this.prisma.generatedArtifact.findFirst({
        where: {
          workspaceId: dto.workspaceId,
          artifactType: dto.artifactType,
          isLatest: true,
        },
      }),
      this.prisma.generatedArtifact.findFirst({
        where: {
          workspaceId: dto.workspaceId,
          artifactType: dto.artifactType,
        },
        orderBy: { version: 'desc' },
      }),
    ]);

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

    const version = mostRecentVersion ? mostRecentVersion.version + 1 : 1;

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

  // Marks every currently-latest artifact of the given type(s) as non-latest, without
  // registering a replacement — used when an artifact is invalidated (superseded by an
  // upstream change) rather than replaced by a freshly-rendered file (ISSUE-363).
  async markNonLatest(
    workspaceId: string,
    artifactTypes: string[],
  ): Promise<void> {
    await this.prisma.generatedArtifact.updateMany({
      where: {
        workspaceId,
        artifactType: { in: artifactTypes },
        isLatest: true,
      },
      data: { isLatest: false },
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
