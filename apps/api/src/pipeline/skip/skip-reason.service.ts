import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import { AiProvider, AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import {
  SkipReasonAnalysis,
  validateSkipReasonJson,
} from '../schemas/skip-reason.schema';

const SKIP_REASON_STEP = 'skip_reason';

const VALID_PRECONDITION_STATUSES: WorkspaceStatus[] = [
  WorkspaceStatus.paused_after_analysis,
  WorkspaceStatus.analysis_ready,
];

export interface ConfirmSkipResult {
  success: boolean;
  workspaceId: string;
  workspaceStatus: WorkspaceStatus;
  artifactPaths?: { md: string; json: string };
  validationError?: string;
}

@Injectable()
export class SkipReasonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async confirmSkip(workspaceId: string): Promise<ConfirmSkipResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    if (!VALID_PRECONDITION_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Workspace status "${workspace.status}" does not allow skip confirmation — ` +
          `required: paused_after_analysis or analysis_ready`,
      );
    }

    if (workspace.currentDecision !== 'skip') {
      throw new BadRequestException(
        `Workspace currentDecision is "${workspace.currentDecision}" — ` +
          `confirm-skip requires currentDecision = skip`,
      );
    }

    const template = await this.promptTemplates.findActive(SKIP_REASON_STEP);
    if (!template) {
      throw new Error(`No active skip_reason template found`);
    }

    const promptRun = await this.promptRuns.create({
      workspaceId,
      promptStep: SKIP_REASON_STEP,
      templateId: template.id,
      templateVersion: template.version,
      inputHash: createHash('sha256')
        .update(workspaceId + template.id)
        .digest('hex'),
    });

    await this.promptRuns.markRunning(promptRun.id);

    const requestHash = createHash('sha256')
      .update(workspaceId + template.content)
      .digest('hex');

    let rawText: string;
    let providerUsage:
      | { inputTokens?: number; outputTokens?: number; totalTokens?: number }
      | undefined;

    try {
      const result = await this.aiProvider.complete(template.content, '', {
        jsonMode: true,
        step: SKIP_REASON_STEP,
      });
      rawText = result.text;
      providerUsage = result.usage;
    } catch (providerError) {
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : String(providerError);

      await this.aiRuns.saveFailed({
        provider: this.aiProvider.providerName,
        model: this.aiProvider.modelName,
        requestHash,
        errorMessage,
      });

      await this.promptRuns.fail(promptRun.id);
      await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: { status: WorkspaceStatus.analysis_ready },
      });

      return {
        success: false,
        workspaceId,
        workspaceStatus: WorkspaceStatus.analysis_ready,
        validationError: `AI provider error: ${errorMessage}`,
      };
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const validation = validateSkipReasonJson(rawText);

    const mdContent = this.buildMarkdown(rawText, validation.data ?? null);
    const { filePath: mdPath, hash: mdHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '01_skip_reason.md',
        mdContent,
      );

    await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'skip_reason_md',
      canonicalFileName: '01_skip_reason.md',
      filePath: mdPath,
      storageRoot: workspace.storageRoot,
      contentHash: mdHash,
      origin: 'skip_reason',
      mimeType: 'text/markdown',
    });

    if (!validation.success) {
      const responseHash = createHash('sha256').update(rawText).digest('hex');

      await this.aiRuns.saveFailed({
        provider: this.aiProvider.providerName,
        model: this.aiProvider.modelName,
        requestHash,
        responseHash,
        errorMessage: `JSON validation failed: ${validation.error ?? 'unknown'}`,
      });

      await this.promptRuns.fail(promptRun.id);
      await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: { status: WorkspaceStatus.analysis_ready },
      });

      return {
        success: false,
        workspaceId,
        workspaceStatus: WorkspaceStatus.analysis_ready,
        validationError: validation.error,
        artifactPaths: { md: mdPath, json: '' },
      };
    }

    const responseHash = createHash('sha256').update(rawText).digest('hex');
    const aiRun = await this.aiRuns.saveSuccess({
      provider: this.aiProvider.providerName,
      model: this.aiProvider.modelName,
      requestHash,
      responseHash,
      inputTokens: providerUsage?.inputTokens,
      outputTokens: providerUsage?.outputTokens,
      totalTokens: providerUsage?.totalTokens,
    });

    const data = validation.data!;
    const jsonContent = JSON.stringify(data, null, 2);
    const { filePath: jsonPath, hash: jsonHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '01_skip_reason.json',
        jsonContent,
      );

    const downloadFileName = this.buildDownloadFileName(
      workspace.company.companySlug,
      workspace.jobVacancy.roleSlug,
    );

    await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'skip_reason_json',
      canonicalFileName: '01_skip_reason.json',
      filePath: jsonPath,
      storageRoot: workspace.storageRoot,
      contentHash: jsonHash,
      origin: 'skip_reason',
      mimeType: 'application/json',
      downloadFileName,
    });

    await this.promptRuns.complete(promptRun.id, {
      aiRunId: aiRun.id,
      outputArtifactIds: [],
    });

    await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.skipped, isSkipped: true },
    });

    return {
      success: true,
      workspaceId,
      workspaceStatus: WorkspaceStatus.skipped,
      artifactPaths: { md: mdPath, json: jsonPath },
    };
  }

  buildDownloadFileName(companySlug: string, roleSlug: string): string {
    return `SKIP_${companySlug}_${roleSlug}_reason_RU.md`;
  }

  private buildMarkdown(
    rawText: string,
    data: SkipReasonAnalysis | null,
  ): string {
    if (data) {
      return [
        `# SKIP — ${data.company} — ${data.role}`,
        ``,
        `Date analyzed: ${new Date().toISOString().slice(0, 10)}`,
        `Company: ${data.company}`,
        `Role: ${data.role}`,
        `Location / remote: ${data.location_remote}`,
        `Core stack: ${data.core_stack.join(', ')}`,
        `Final score: ${data.score}`,
        `Decision: SKIP`,
        ``,
        `## Main skip reason`,
        data.main_skip_reason,
        ``,
        `## Key mismatches`,
        data.key_mismatches.map((m) => `- ${m}`).join('\n'),
        ``,
        `## Evidence from my profile`,
        data.evidence_from_profile.map((e) => `- ${e}`).join('\n'),
        ``,
        `## Risks if applying anyway`,
        data.risks_if_applying_anyway.map((r) => `- ${r}`).join('\n'),
        ``,
        `## Useful keywords to track later`,
        data.useful_keywords_to_track_later.map((k) => `- ${k}`).join('\n'),
        ``,
        `## Future reconsideration condition`,
        data.future_reconsideration_condition,
      ].join('\n');
    }

    return [`# Skip Reason (raw — JSON validation failed)`, ``, rawText].join(
      '\n',
    );
  }
}
