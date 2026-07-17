import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CoverLetterDraft, WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import { AiProvider, AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { CoverLetterDraftsService } from '../../cover-letters/cover-letter-drafts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { WorkspaceStatusService } from '../../workspaces/workspace-status.service';
import { CoverLetterInputBuilderService } from './cover-letter-input-builder.service';
import {
  CoverLetterOutput,
  validateCoverLetterJson,
} from '../schemas/cover-letter.schema';

export interface GenerateCoverLetterResult {
  success: boolean;
  promptRunId: string;
  aiRunId: string;
  workspaceStatus: WorkspaceStatus;
  coverLetterDraft?: CoverLetterDraft;
  artifactPaths?: { md: string; json: string };
  validationError?: string;
}

const COVER_LETTER_STEP = 'cover_letter';

@Injectable()
export class CoverLetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly promptInputBuilder: CoverLetterInputBuilderService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    private readonly workspaceStatusService: WorkspaceStatusService,
    private readonly coverLetterDraftsService: CoverLetterDraftsService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async generateCoverLetter(
    workspaceId: string,
  ): Promise<GenerateCoverLetterResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const template = await this.promptTemplates.findActive(COVER_LETTER_STEP);
    if (!template) {
      throw new Error(
        `No active cover letter template found for step "${COVER_LETTER_STEP}"`,
      );
    }

    // buildCoverLetterInput guards status internally
    const { promptText, inputContext, sourceSnapshot } =
      await this.promptInputBuilder.buildCoverLetterInput(
        {
          id: workspace.id,
          status: workspace.status,
          companyNameOriginal: workspace.company.nameOriginal,
          roleTitleOriginal: workspace.jobVacancy.roleTitleOriginal,
          workspacePath: workspace.workspacePath,
          storageRoot: workspace.storageRoot,
        },
        template.content,
      );

    const inputHash = createHash('sha256')
      .update(promptText + inputContext)
      .digest('hex');

    const promptRun = await this.promptRuns.create({
      workspaceId,
      promptStep: COVER_LETTER_STEP,
      templateId: template.id,
      templateVersion: template.version,
      inputHash,
      sourceSnapshot,
    });

    await this.promptRuns.markRunning(promptRun.id);

    const requestHash = createHash('sha256')
      .update(promptText + inputContext)
      .digest('hex');

    let rawText: string;
    let providerUsage:
      | {
          inputTokens?: number;
          outputTokens?: number;
          totalTokens?: number;
          cachedInputTokens?: number;
          rawJson?: string;
        }
      | undefined;

    try {
      const result = await this.aiProvider.complete(promptText, inputContext, {
        jsonMode: true,
        step: COVER_LETTER_STEP,
      });
      rawText = result.text;
      providerUsage = result.usage;
    } catch (providerError) {
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : String(providerError);

      const aiRun = await this.aiRuns.saveFailed({
        provider: this.aiProvider.providerName,
        model: this.aiProvider.modelName,
        requestHash,
        errorMessage,
      });

      await this.promptRuns.fail(promptRun.id);

      return {
        success: false,
        promptRunId: promptRun.id,
        aiRunId: aiRun.id,
        workspaceStatus: workspace.status,
        validationError: `AI provider error: ${errorMessage}`,
      };
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const validation = validateCoverLetterJson(rawText);

    const mdContent = this.buildMarkdown(
      rawText,
      validation.data ?? null,
      workspace.company.nameOriginal,
      workspace.jobVacancy.roleTitleOriginal,
    );

    const { filePath: mdPath, hash: mdHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        'cover_letter.md',
        mdContent,
      );

    const mdArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'cover_letter_md',
      canonicalFileName: 'cover_letter.md',
      filePath: mdPath,
      storageRoot: workspace.storageRoot,
      contentHash: mdHash,
      origin: 'cover_letter',
      mimeType: 'text/markdown',
    });

    if (!validation.success) {
      const responseHash = createHash('sha256').update(rawText).digest('hex');
      const aiRun = await this.aiRuns.saveFailed({
        provider: this.aiProvider.providerName,
        model: this.aiProvider.modelName,
        requestHash,
        responseHash,
        errorMessage: `JSON validation failed: ${validation.error ?? 'unknown'}`,
      });

      await this.promptRuns.fail(promptRun.id);

      return {
        success: false,
        promptRunId: promptRun.id,
        aiRunId: aiRun.id,
        workspaceStatus: workspace.status,
        validationError: validation.error,
        artifactPaths: { md: mdPath, json: '' },
      };
    }

    const coverLetterData = validation.data!;
    const jsonContent = JSON.stringify(coverLetterData, null, 2);
    const responseHash = createHash('sha256').update(rawText).digest('hex');

    const { filePath: jsonPath, hash: jsonHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        'cover_letter.json',
        jsonContent,
      );

    const jsonArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'cover_letter_json',
      canonicalFileName: 'cover_letter.json',
      filePath: jsonPath,
      storageRoot: workspace.storageRoot,
      contentHash: jsonHash,
      origin: 'cover_letter',
      mimeType: 'application/json',
    });

    const aiRun = await this.aiRuns.saveSuccess({
      provider: this.aiProvider.providerName,
      model: this.aiProvider.modelName,
      requestHash,
      responseHash,
      inputTokens: providerUsage?.inputTokens,
      outputTokens: providerUsage?.outputTokens,
      totalTokens: providerUsage?.totalTokens,
      cachedInputTokens: providerUsage?.cachedInputTokens,
      usageRawJson: providerUsage?.rawJson,
    });

    await this.promptRuns.complete(promptRun.id, {
      aiRunId: aiRun.id,
      outputArtifactIds: [mdArtifact.id, jsonArtifact.id],
    });

    // Create the CoverLetterDraft row before flipping workspace.status: at this
    // point status is still cv_pdf_generated/final_check_ready (never skipped),
    // so create()'s own skip-guard cannot fire — only genuine failures (workspace
    // deleted mid-request, DB error) can throw here. Keeping workspace.status
    // unchanged on failure means the endpoint stays retry-safe (the AI step
    // itself already succeeded — PromptRun/AiRun stay completed/success).
    let coverLetterDraft: CoverLetterDraft;
    try {
      coverLetterDraft = await this.coverLetterDraftsService.create(
        workspaceId,
        {
          letterType: COVER_LETTER_STEP,
          promptRunId: promptRun.id,
        },
      );
    } catch (draftError) {
      const errorMessage =
        draftError instanceof Error ? draftError.message : String(draftError);

      return {
        success: false,
        promptRunId: promptRun.id,
        aiRunId: aiRun.id,
        workspaceStatus: workspace.status,
        validationError: `Cover letter draft creation failed: ${errorMessage}`,
        artifactPaths: { md: mdPath, json: jsonPath },
      };
    }

    // docs/08_ai_pipeline.md §15.7: cover letter generation completes -> cover_letter_generated
    this.workspaceStatusService.assertValidTransition(
      workspace.status,
      WorkspaceStatus.cover_letter_generated,
    );
    await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.cover_letter_generated },
    });

    return {
      success: true,
      promptRunId: promptRun.id,
      aiRunId: aiRun.id,
      workspaceStatus: WorkspaceStatus.cover_letter_generated,
      coverLetterDraft,
      artifactPaths: { md: mdPath, json: jsonPath },
    };
  }

  private buildMarkdown(
    rawText: string,
    data: CoverLetterOutput | null,
    companyName: string,
    roleTitle: string,
  ): string {
    if (!data) {
      return [
        `# Cover Letter (raw — JSON validation failed)`,
        `## Company: ${companyName} | Role: ${roleTitle}`,
        ``,
        rawText,
      ].join('\n');
    }

    const subjectLines = data.subject
      ? [`**Subject:** ${data.subject}`, ``]
      : [];

    return [
      `# Cover Letter — ${companyName} — ${roleTitle}`,
      ``,
      ...subjectLines,
      data.cover_letter.greeting,
      ``,
      ...data.cover_letter.body_paragraphs,
      ``,
      data.cover_letter.closing,
    ].join('\n');
  }
}
