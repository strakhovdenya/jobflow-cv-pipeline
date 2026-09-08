import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import { AiProvider, AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { EvidenceGuardService } from '../../evidence/evidence-guard.service';
import { EvidenceService } from '../../evidence/evidence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { Prompt2InputBuilderService } from './prompt2-input-builder.service';
import {
  TargetedCvContentOutput,
  validateTargetedCvContentJson,
} from '../schemas/targeted-cv-content.schema';

export interface GenerateCvResult {
  success: boolean;
  promptRunId: string;
  aiRunId: string;
  workspaceStatus: WorkspaceStatus;
  artifactPaths?: { md: string; json: string };
  validationError?: string;
}

const PROMPT2_STEP = 'prompt_2';

@Injectable()
export class Prompt2Service {
  private readonly logger = new Logger(Prompt2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly promptInputBuilder: Prompt2InputBuilderService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    private readonly evidenceGuard: EvidenceGuardService,
    private readonly evidenceService: EvidenceService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async generateCvContent(
    workspaceId: string,
    notes?: string,
  ): Promise<GenerateCvResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const template = await this.promptTemplates.findActive(PROMPT2_STEP);
    if (!template) {
      throw new Error(
        `No active Prompt 2 template found for step "${PROMPT2_STEP}"`,
      );
    }

    const manualNotes = await this.prisma.manualNote.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    // buildPrompt2Input guards the allowed statuses (first generation or regenerate) internally
    const { promptText, inputContext, sourceSnapshot, isRegenerate } =
      await this.promptInputBuilder.buildPrompt2Input(
        {
          id: workspace.id,
          status: workspace.status,
          companyNameOriginal: workspace.company.nameOriginal,
          companySlug: workspace.company.companySlug,
          roleTitleOriginal: workspace.jobVacancy.roleTitleOriginal,
          roleSlug: workspace.jobVacancy.roleSlug,
          workspacePath: workspace.workspacePath,
          storageRoot: workspace.storageRoot,
          manualNotes,
        },
        template.content,
        template.version,
        notes,
      );

    const inputHash = createHash('sha256')
      .update(promptText + inputContext)
      .digest('hex');

    const promptRun = await this.promptRuns.create({
      workspaceId,
      promptStep: PROMPT2_STEP,
      templateId: template.id,
      templateVersion: template.version,
      inputHash,
      sourceSnapshot,
    });

    await this.promptRuns.markRunning(promptRun.id);

    if (manualNotes.length > 0) {
      await this.prisma.manualNoteApplication.createMany({
        data: manualNotes.map((note) => ({
          manualNoteId: note.id,
          promptRunId: promptRun.id,
          stepDetail: isRegenerate ? 'regenerate' : 'generate',
        })),
      });
    }

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
        step: PROMPT2_STEP,
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

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const validation = validateTargetedCvContentJson(rawText);

    // Run deterministic anti-overclaiming guard before writing either artifact,
    // so both .md and .json contain the guard result rather than the passive AI output.
    if (validation.success && validation.data) {
      const evidenceItems = await this.evidenceService.findAll();
      const guardResult = this.evidenceGuard.checkOutput(
        validation.data,
        evidenceItems,
      );
      validation.data.overclaiming_check = {
        critical_issues: guardResult.critical_issues,
        warnings: guardResult.warnings,
        needs_evidence: guardResult.needs_evidence,
      };
    }

    const mdContent = this.buildMarkdown(
      rawText,
      validation.data ?? null,
      workspace.company.nameOriginal,
      workspace.jobVacancy.roleTitleOriginal,
    );

    const { filePath: mdPath, hash: mdHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '02_targeted_cv_content.md',
        mdContent,
      );

    const mdArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'targeted_cv_content_md',
      canonicalFileName: '02_targeted_cv_content.md',
      filePath: mdPath,
      storageRoot: workspace.storageRoot,
      contentHash: mdHash,
      origin: 'prompt_2',
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

    const analysisData = validation.data!;
    const jsonContent = JSON.stringify(analysisData, null, 2);
    const responseHash = createHash('sha256').update(rawText).digest('hex');

    const { filePath: jsonPath, hash: jsonHash } =
      await this.artifactStorage.writeFile(
        workspaceAbsPath,
        '02_targeted_cv_content.json',
        jsonContent,
      );

    const jsonArtifact = await this.artifactsService.register({
      workspaceId,
      promptRunId: promptRun.id,
      artifactType: 'targeted_cv_content_json',
      canonicalFileName: '02_targeted_cv_content.json',
      filePath: jsonPath,
      storageRoot: workspace.storageRoot,
      contentHash: jsonHash,
      origin: 'prompt_2',
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

    // ISSUE-363: regenerating from pre_pdf_check_ready/paused_before_export means a Prompt 3
    // result (03_pre_pdf_check.*) may already exist on disk, keyed by field_path against the
    // PREVIOUS CV draft. If left in place, a subsequent "Skip pre-PDF check" (ADR-026 — skipping
    // is a valid way to clear the gate, no new Prompt 3 run required) would let DocumentExportService
    // silently apply those now-stale corrections onto this brand-new draft. Invalidate it here so
    // the gate must be cleared fresh against the new content.
    if (
      workspace.status === WorkspaceStatus.pre_pdf_check_ready ||
      workspace.status === WorkspaceStatus.paused_before_export
    ) {
      await this.invalidateStalePrePdfCheck(workspaceId, workspaceAbsPath);
    }

    // §8.6 docs/03_domain_model.md: Prompt 2 completes → cv_draft_ready
    // paused_after_cv_draft is set by the CV draft review gate (TASK-034)
    await this.prisma.applicationWorkspace.update({
      where: { id: workspaceId },
      data: { status: WorkspaceStatus.cv_draft_ready },
    });

    return {
      success: true,
      promptRunId: promptRun.id,
      aiRunId: aiRun.id,
      workspaceStatus: WorkspaceStatus.cv_draft_ready,
      artifactPaths: { md: mdPath, json: jsonPath },
    };
  }

  // Deletes the on-disk 03_pre_pdf_check.md/.json (best-effort — a missing file is fine) and
  // marks their GeneratedArtifact rows non-latest, so neither the export path
  // (HtmlRendererService.readCorrections, keyed by fixed canonical path) nor
  // pre-pdf-check-panel.tsx (keyed by isLatest) can surface a result that belonged to the CV
  // draft this regenerate just replaced. Best-effort and non-fatal: the new CV draft is already
  // registered and complete by the time this runs, so a failure here (e.g. a locked file) must
  // not block the regenerate response — it only means the stale-corrections risk this exists to
  // close isn't closed for this one call, matching the pre-fix behavior rather than something
  // worse. Logged as a warning so it's visible, not silently swallowed.
  private async invalidateStalePrePdfCheck(
    workspaceId: string,
    workspaceAbsPath: string,
  ): Promise<void> {
    // allSettled (not all): one file's unlink failing must not skip markNonLatest for both
    // artifact rows — otherwise a partial failure (e.g. the .md unlink succeeds but .json's
    // throws EBUSY) would leave the .json GeneratedArtifact row pointing at a file already
    // deleted by the other, successful unlink, with isLatest still true.
    const deleteResults = await Promise.allSettled([
      this.artifactStorage.deleteFileIfExists(
        path.join(workspaceAbsPath, '03_pre_pdf_check.md'),
      ),
      this.artifactStorage.deleteFileIfExists(
        path.join(workspaceAbsPath, '03_pre_pdf_check.json'),
      ),
    ]);
    for (const result of deleteResults) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to delete a stale 03_pre_pdf_check.* file for workspace "${workspaceId}" after regenerate: ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`,
        );
      }
    }

    try {
      await this.artifactsService.markNonLatest(workspaceId, [
        'pre_pdf_check_md',
        'pre_pdf_check_json',
      ]);
    } catch (error) {
      this.logger.warn(
        `Failed to mark stale 03_pre_pdf_check.* artifacts non-latest for workspace "${workspaceId}" after regenerate — ` +
          `the pre-PDF check gate may re-show/re-apply a result from the previous CV draft: ${
            error instanceof Error ? error.message : String(error)
          }`,
      );
    }
  }

  private buildMarkdown(
    rawText: string,
    data: TargetedCvContentOutput | null,
    companyName: string,
    roleTitle: string,
  ): string {
    if (!data) {
      return [
        `# Targeted CV Content (raw — JSON validation failed)`,
        `## Company: ${companyName} | Role: ${roleTitle}`,
        ``,
        rawText,
      ].join('\n');
    }

    const {
      cv_content: cv,
      target_strategy: ts,
      evidence_table,
      overclaiming_check,
      pdf_readiness_notes,
    } = data;

    const currentWorkBlock = cv.current_work_block.include
      ? [
          `### ${cv.current_work_block.role_line} (${cv.current_work_block.dates})`,
          ...(cv.current_work_block.location
            ? [cv.current_work_block.location]
            : []),
          cv.current_work_block.stable_intro,
          cv.current_work_block.bullets
            .map((b) => `- [${b.priority}] ${b.text}`)
            .join('\n'),
          `**Tech:** ${cv.current_work_block.tech_stack.join(', ')}`,
        ].join('\n')
      : '_Not included for this vacancy._';

    const experienceBlock = cv.experience
      .map((exp) => {
        const bullets = exp.bullets
          .map((b) => `- [${b.priority}] ${b.text}`)
          .join('\n');
        return [
          `### ${exp.company} — ${exp.role} (${exp.dates})`,
          `*Type: ${exp.experience_type}*`,
          bullets,
          `**Tech:** ${exp.tech_stack.join(', ')}`,
        ].join('\n');
      })
      .join('\n\n');

    const projectsBlock =
      cv.selected_projects.length > 0
        ? cv.selected_projects
            .filter((p) => p.include)
            .map((p) => {
              const bullets = p.bullets
                .map((b) => `- [${b.priority}] ${b.text}`)
                .join('\n');
              return [
                `### ${p.title} (${p.safe_label})`,
                `*Relevance: ${p.relevance_reason}*`,
                bullets,
                `**Tech:** ${p.tech_stack.join(', ')}`,
              ].join('\n');
            })
            .join('\n\n')
        : '_No personal/current projects selected._';

    const evidenceBlock =
      evidence_table.length > 0
        ? evidence_table
            .map(
              (e) =>
                `- **${e.claim}** [${e.status}] — ${e.support ?? 'no support'}`,
            )
            .join('\n')
        : '_No evidence entries._';

    return [
      `# Targeted CV Content — ${companyName} — ${roleTitle}`,
      ``,
      `## Metadata`,
      `Schema version: ${data.schema_version} | Workspace: ${data.workspace_id}`,
      `Decision: ${data.decision_context.prompt_1_decision} | Approved: ${String(data.decision_context.user_approval)}`,
      ``,
      `## Target Strategy`,
      `**Positioning:** ${ts.positioning}`,
      `**Angle:** ${ts.main_angle}`,
      `**Risk mitigation:** ${ts.risk_mitigation.join('; ')}`,
      ``,
      `## Headline`,
      cv.headline,
      ``,
      `## Summary`,
      cv.summary.map((s) => `- ${s}`).join('\n'),
      ``,
      `## Top Skills`,
      cv.top_skills.join(', '),
      ``,
      `## Quality Score`,
      String(data.quality_score),
      ``,
      `## ${cv.current_work_block.safe_label}`,
      currentWorkBlock,
      ``,
      `## Professional Experience`,
      experienceBlock,
      ``,
      `## Selected Projects`,
      projectsBlock,
      ``,
      `## Evidence Table`,
      evidenceBlock,
      ``,
      `## Overclaiming Check`,
      `**Critical issues:** ${overclaiming_check.critical_issues.join(', ') || 'none'}`,
      `**Warnings:** ${overclaiming_check.warnings.join('; ') || 'none'}`,
      `**Needs evidence:** ${overclaiming_check.needs_evidence.join(', ') || 'none'}`,
      ``,
      `## PDF Readiness Notes`,
      `Estimated pages: ${pdf_readiness_notes.estimated_page_count}`,
      `Next step: ${pdf_readiness_notes.recommended_next_step}`,
    ].join('\n');
  }
}
