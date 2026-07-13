import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { Prompt5InputBuilderService } from './prompt5-input-builder.service';
import {
  FinalCheckOutput,
  validateFinalCheckJson,
} from '../schemas/final-check.schema';

export interface RunFinalCheckResult {
  success: boolean;
  promptRunId: string;
  aiRunId: string;
  workspaceStatus: WorkspaceStatus;
  finalDecision?: string;
  artifactPaths?: { md: string; json: string };
  validationError?: string;
}

const PROMPT5_STEP = 'prompt_5';

@Injectable()
export class Prompt5Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly promptInputBuilder: Prompt5InputBuilderService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async runFinalCheck(workspaceId: string): Promise<RunFinalCheckResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const template = await this.promptTemplates.findActive(PROMPT5_STEP);
    if (!template) {
      throw new Error(
        `No active Prompt 5 template found for step "${PROMPT5_STEP}"`,
      );
    }

    // buildPrompt5Input guards status === cv_pdf_generated internally
    const { promptText, inputContext, sourceSnapshot } =
      await this.promptInputBuilder.buildPrompt5Input(
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
      promptStep: PROMPT5_STEP,
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
        step: PROMPT5_STEP,
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

      // Prompt 5 failure does not invalidate the PDF artifact — keep status
      // at cv_pdf_generated so the user can still download it manually.
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

    const validation = validateFinalCheckJson(rawText);

    const mdContent = this.buildMarkdown(
      rawText,
      validation.data ?? null,
      workspace.company.nameOriginal,
      workspace.jobVacancy.roleTitleOriginal,
    );

    const { filePath: mdPath, hash: mdHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '05_final_check.md',
        mdContent,
      );

    const mdArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'final_check_md',
      canonicalFileName: '05_final_check.md',
      filePath: mdPath,
      storageRoot: workspace.storageRoot,
      contentHash: mdHash,
      origin: 'prompt_5',
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

    const checkData = validation.data!;
    const jsonContent = JSON.stringify(checkData, null, 2);
    const responseHash = createHash('sha256').update(rawText).digest('hex');

    const { filePath: jsonPath, hash: jsonHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '05_final_check.json',
        jsonContent,
      );

    const jsonArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'final_check_json',
      canonicalFileName: '05_final_check.json',
      filePath: jsonPath,
      storageRoot: workspace.storageRoot,
      contentHash: jsonHash,
      origin: 'prompt_5',
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

    // docs/08_ai_pipeline.md §14.6: Prompt 5 completes -> final_check_ready
    await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.final_check_ready },
    });

    return {
      success: true,
      promptRunId: promptRun.id,
      aiRunId: aiRun.id,
      workspaceStatus: WorkspaceStatus.final_check_ready,
      finalDecision: checkData.final_decision,
      artifactPaths: { md: mdPath, json: jsonPath },
    };
  }

  private buildMarkdown(
    rawText: string,
    data: FinalCheckOutput | null,
    companyName: string,
    roleTitle: string,
  ): string {
    if (!data) {
      return [
        `# Final Check (raw — JSON validation failed)`,
        `## Company: ${companyName} | Role: ${roleTitle}`,
        ``,
        rawText,
      ].join('\n');
    }

    const listOrNone = (items: string[]): string =>
      items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : '_None._';

    return [
      `# Final Check — ${companyName} — ${roleTitle}`,
      ``,
      `## Final Decision`,
      data.final_decision,
      ``,
      `## Quality Score`,
      String(data.quality_score),
      ``,
      `## Page Count`,
      String(data.page_count),
      ``,
      `## Missing Sections`,
      listOrNone(data.missing_sections),
      ``,
      `## Formatting Issues`,
      listOrNone(data.formatting_issues),
      ``,
      `## Overclaiming Issues`,
      listOrNone(data.overclaiming_issues),
      ``,
      `## Broken Links`,
      listOrNone(data.broken_links),
      ``,
      `## Warnings`,
      listOrNone(data.warnings),
      ``,
      `## Final Checklist`,
      `- PDF opens: ${data.final_checklist.pdf_opens}`,
      `- Content matches vacancy: ${data.final_checklist.content_matches_vacancy}`,
      `- No unsupported claims: ${data.final_checklist.no_unsupported_claims}`,
      `- Contact info present: ${data.final_checklist.contact_info_present}`,
      `- Ready to apply: ${data.final_checklist.ready_to_apply}`,
    ].join('\n');
  }
}
