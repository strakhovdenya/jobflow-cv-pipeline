import { Injectable } from '@nestjs/common';
import { GeneratedArtifact, Prisma } from '@prisma/client';
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

  // Demoting the previous latest row and creating the new one must be atomic, and concurrent
  // registrations for the same workspace must not read the same max version: the workspace row is
  // locked (FOR UPDATE) for the duration of the transaction, which serializes them. Pass `tx` to
  // make the registration part of a caller's transaction (import, workspace creation) — the lock
  // is then held until that transaction ends. The unique indexes on GeneratedArtifact are the
  // DB-level backstop if a caller ever bypasses this method.
  async register(
    dto: RegisterArtifactDto,
    tx?: Prisma.TransactionClient,
  ): Promise<GeneratedArtifact> {
    if (tx) {
      return this.registerWithClient(dto, tx);
    }
    return this.prisma.$transaction((client) =>
      this.registerWithClient(dto, client),
    );
  }

  private async registerWithClient(
    dto: RegisterArtifactDto,
    client: Prisma.TransactionClient,
  ): Promise<GeneratedArtifact> {
    await client.$queryRaw`SELECT "id" FROM "ApplicationWorkspace" WHERE "id" = ${dto.workspaceId} FOR UPDATE`;

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
      client.generatedArtifact.findFirst({
        where: {
          workspaceId: dto.workspaceId,
          artifactType: dto.artifactType,
          isLatest: true,
        },
      }),
      client.generatedArtifact.findFirst({
        where: {
          workspaceId: dto.workspaceId,
          artifactType: dto.artifactType,
        },
        orderBy: { version: 'desc' },
      }),
    ]);

    if (previousLatest) {
      await client.generatedArtifact.updateMany({
        where: {
          workspaceId: dto.workspaceId,
          artifactType: dto.artifactType,
          isLatest: true,
        },
        data: { isLatest: false },
      });
    }

    const version = mostRecentVersion ? mostRecentVersion.version + 1 : 1;

    return client.generatedArtifact.create({
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
