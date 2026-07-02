import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { VacancyDecision, WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import { AiProvider, AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { PromptInputBuilderService } from '../prompt-input-builder.service';
import {
  Prompt1Analysis,
  validatePrompt1Json,
} from '../schemas/prompt1.schema';

export interface RunAnalysisResult {
  success: boolean;
  promptRunId: string;
  aiRunId: string;
  workspaceStatus: WorkspaceStatus;
  decision?: VacancyDecision;
  score?: number;
  artifactPaths?: { md: string; json: string };
  validationError?: string;
}

const PROMPT1_STEP = 'prompt_1';

function decisionToEnum(raw: string): VacancyDecision {
  if (raw === 'apply') return VacancyDecision.apply;
  if (raw === 'maybe') return VacancyDecision.maybe;
  return VacancyDecision.skip;
}

@Injectable()
export class Prompt1Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly knowledgeSources: KnowledgeSourcesService,
    private readonly selectionService: KnowledgeSourceSelectionService,
    private readonly promptInputBuilder: PromptInputBuilderService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async runAnalysis(workspaceId: string): Promise<RunAnalysisResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const template = await this.promptTemplates.findActive(PROMPT1_STEP);
    if (!template) {
      throw new Error(
        `No active Prompt 1 template found for step "${PROMPT1_STEP}"`,
      );
    }

    const activeSources = await this.knowledgeSources.findActive();
    const selectedSources = this.selectionService.selectForStep(
      'prompt_1',
      activeSources,
    );

    const { promptText, inputContext, sourceSnapshot } =
      await this.promptInputBuilder.buildPrompt1Input(
        {
          companyNameOriginal: workspace.company.nameOriginal,
          companySlug: workspace.company.companySlug,
          roleTitleOriginal: workspace.jobVacancy.roleTitleOriginal,
          roleSlug: workspace.jobVacancy.roleSlug,
          workspaceSlug: workspace.workspaceSlug,
          workspacePath: workspace.workspacePath,
          storageRoot: workspace.storageRoot,
        },
        template.content,
        selectedSources,
      );

    const inputHash = createHash('sha256')
      .update(promptText + inputContext)
      .digest('hex');

    const promptRun = await this.promptRuns.create({
      workspaceId,
      promptStep: PROMPT1_STEP,
      templateId: template.id,
      templateVersion: template.version,
      inputHash,
      sourceSnapshot,
    });

    await this.promptRuns.markRunning(promptRun.id);

    await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.analysis_running },
    });

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
    const requestHash = createHash('sha256')
      .update(promptText + inputContext)
      .digest('hex');

    try {
      const result = await this.aiProvider.complete(promptText, inputContext, {
        jsonMode: true,
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
      await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: { status: WorkspaceStatus.failed },
      });

      return {
        success: false,
        promptRunId: promptRun.id,
        aiRunId: aiRun.id,
        workspaceStatus: WorkspaceStatus.failed,
        validationError: `AI provider error: ${errorMessage}`,
      };
    }

    const validation = validatePrompt1Json(rawText);
    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const mdContent = this.buildMarkdown(rawText, validation.data ?? null);
    const { filePath: mdPath, hash: mdHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '01_vacancy_analysis.md',
        mdContent,
      );

    const mdArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'vacancy_analysis_md',
      canonicalFileName: '01_vacancy_analysis.md',
      filePath: mdPath,
      storageRoot: workspace.storageRoot,
      contentHash: mdHash,
      origin: 'prompt_1',
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
      await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: { status: WorkspaceStatus.failed },
      });

      return {
        success: false,
        promptRunId: promptRun.id,
        aiRunId: aiRun.id,
        workspaceStatus: WorkspaceStatus.failed,
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
      cachedInputTokens: providerUsage?.cachedInputTokens,
      usageRawJson: providerUsage?.rawJson,
    });
    const aiRunId = aiRun.id;

    // validation.success is true here — data is guaranteed by validatePrompt1Json
    const analysisData = validation.data!;
    const jsonContent = JSON.stringify(analysisData, null, 2);
    const { filePath: jsonPath, hash: jsonHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '01_vacancy_analysis.json',
        jsonContent,
      );

    const jsonArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'vacancy_analysis_json',
      canonicalFileName: '01_vacancy_analysis.json',
      filePath: jsonPath,
      storageRoot: workspace.storageRoot,
      contentHash: jsonHash,
      origin: 'prompt_1',
      mimeType: 'application/json',
    });

    const decision = decisionToEnum(analysisData.decision);

    await this.promptRuns.complete(promptRun.id, {
      aiRunId,
      outputArtifactIds: [mdArtifact.id, jsonArtifact.id],
    });

    await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: {
        status: WorkspaceStatus.paused_after_analysis,
        currentDecision: decision,
        score: analysisData.score,
        nextRecommendedAction: analysisData.recommended_next_action,
      },
    });

    return {
      success: true,
      promptRunId: promptRun.id,
      aiRunId,
      workspaceStatus: WorkspaceStatus.paused_after_analysis,
      decision,
      score: analysisData.score,
      artifactPaths: { md: mdPath, json: jsonPath },
    };
  }

  private buildMarkdown(rawText: string, data: Prompt1Analysis | null): string {
    if (data) {
      return [
        `# Vacancy Analysis — ${data.workspace.company_name_original} — ${data.workspace.role_title_original}`,
        ``,
        `## Decision`,
        data.decision.toUpperCase(),
        ``,
        `## Score`,
        String(data.score),
        ``,
        `## Summary`,
        data.summary,
        ``,
        `## Must-have Requirements`,
        data.must_have
          .map(
            (m) =>
              `- **${m.requirement}** [${m.match_level}] — ${m.evidence_status}`,
          )
          .join('\n'),
        ``,
        `## Hidden Role Logic`,
        data.hidden_role_logic.length > 0
          ? data.hidden_role_logic.map((h) => `- ${h}`).join('\n')
          : '_None identified._',
        ``,
        `## Tech Stack Match`,
        `**Strong:** ${data.tech_stack_match.strong.join(', ') || 'none'}`,
        `**Transferable:** ${data.tech_stack_match.transferable.join(', ') || 'none'}`,
        `**Weak/Missing:** ${data.tech_stack_match.weak_or_missing.join(', ') || 'none'}`,
        ``,
        `## Language Risk`,
        `${data.language_risk.risk_level} — ${data.language_risk.notes}`,
        ``,
        `## Location Risk`,
        `${data.location_risk.risk_level} — ${data.location_risk.notes}`,
        ``,
        `## Evidence Risks`,
        data.evidence_risks.length > 0
          ? data.evidence_risks
              .map((r) => `- ${r.claim}: ${r.status}`)
              .join('\n')
          : '_None identified._',
        ``,
        `## Top Reasons`,
        data.top_reasons.map((r) => `- ${r}`).join('\n'),
        ``,
        `## Recommended Next Action`,
        data.recommended_next_action,
      ].join('\n');
    }

    return [
      `# Vacancy Analysis (raw — JSON validation failed)`,
      ``,
      rawText,
    ].join('\n');
  }
}
