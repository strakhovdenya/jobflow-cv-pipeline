import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as path from 'path';
import { WorkspaceStatus } from '@prisma/client';
import { AiProvider, AI_PROVIDER } from '../../ai/ai-provider.interface';
import { AiRunsService } from '../../ai-runs/ai-runs.service';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { ArtifactsService } from '../../artifacts/artifacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptRunsService } from '../../prompt-runs/prompt-runs.service';
import { PromptTemplatesService } from '../../prompt-templates/prompt-templates.service';
import { WorkspaceStatusService } from '../../workspaces/workspace-status.service';
import { Prompt3InputBuilderService } from './prompt3-input-builder.service';
import {
  PrePdfCheckOutput,
  validatePrePdfCheckJson,
  CORRECTABLE_FIELD_PATH_PATTERN,
  describeFieldPath,
} from '../schemas/pre-pdf-check.schema';

// The export cannot apply certifications[i] yet (the CV entry is an object and its index differs
// from Prompt 2's, #507), so the human must not assume it was fixed automatically.
const isCertificationPath = (fieldPath: string): boolean =>
  fieldPath.startsWith('certifications[');
const CERTIFICATION_NOT_APPLIED_NOTE =
  '_Not applied to the exported PDF automatically (certificate corrections, #507) — edit it by hand or regenerate the CV draft._';

export interface RunPrePdfCheckResult {
  success: boolean;
  promptRunId: string;
  aiRunId: string;
  readiness?: string;
  artifactPaths?: { md: string; json: string };
  validationError?: string;
}

const PROMPT3_STEP = 'prompt_3';

// OpenAI strict json_schema mode: every property must be listed in
// `required` (optional fields are modeled as nullable instead) and every
// object needs `additionalProperties: false`. Forcing this shape stops the
// model from silently omitting a required field (observed for
// `quality_score` under the previous loose `json_object` mode).
const PRE_PDF_CHECK_JSON_SCHEMA = {
  name: 'pre_pdf_check_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      schema_version: { type: 'string' },
      workspace_id: { type: 'string' },
      // `corrections` is declared BEFORE `readiness` on purpose. OpenAI's strict
      // json_schema mode generates properties in declaration order, so listing
      // `readiness` first forced the model to commit to a verdict before it had
      // enumerated its findings — observed in the ISSUE-250 v4 calibration run,
      // where a `critical` correction coexisted with `ready_with_minor_edits`.
      // Emitting the findings first makes `readiness` a summary of what was
      // already written rather than a prediction of it.
      corrections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            // Same grammar the validator and the export enforce (ISSUE-492), so the model
            // cannot even produce a path outside the correctable CV fields.
            field_path: {
              type: 'string',
              pattern: CORRECTABLE_FIELD_PATH_PATTERN,
            },
            original_text: { type: ['string', 'null'] },
            suggested_text: { type: 'string' },
            severity: {
              type: 'string',
              enum: ['critical', 'warning', 'suggestion'],
            },
            reason: { type: 'string' },
          },
          required: [
            'field_path',
            'original_text',
            'suggested_text',
            'severity',
            'reason',
          ],
          additionalProperties: false,
        },
      },
      readiness: {
        type: 'string',
        enum: ['ready', 'ready_with_minor_edits', 'not_ready'],
      },
      quality_score: { type: 'number' },
      export_blocked: { type: 'boolean' },
      overall_notes: { type: 'string' },
    },
    required: [
      'schema_version',
      'workspace_id',
      'corrections',
      'readiness',
      'quality_score',
      'export_blocked',
      'overall_notes',
    ],
    additionalProperties: false,
  },
};

@Injectable()
export class Prompt3Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly promptInputBuilder: Prompt3InputBuilderService,
    private readonly promptRuns: PromptRunsService,
    private readonly aiRuns: AiRunsService,
    private readonly artifactStorage: ArtifactStorageService,
    private readonly artifactsService: ArtifactsService,
    private readonly workspaceStatus: WorkspaceStatusService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  async runPrePdfCheck(workspaceId: string): Promise<RunPrePdfCheckResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const template = await this.promptTemplates.findActive(PROMPT3_STEP);
    if (!template) {
      throw new InternalServerErrorException(
        `No active Prompt 3 template found for step "${PROMPT3_STEP}"`,
      );
    }

    // buildPrompt3Input guards status in [cv_draft_ready, paused_after_cv_draft] internally
    const { promptText, inputContext, sourceSnapshot } =
      await this.promptInputBuilder.buildPrompt3Input(
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
      promptStep: PROMPT3_STEP,
      templateId: template.id,
      templateVersion: template.version,
      inputHash,
      sourceSnapshot,
    });

    try {
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
        const result = await this.aiProvider.complete(
          promptText,
          inputContext,
          {
            jsonMode: true,
            jsonSchema: PRE_PDF_CHECK_JSON_SCHEMA,
            step: PROMPT3_STEP,
          },
        );
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
          validationError: `AI provider error: ${errorMessage}`,
        };
      }

      const workspaceAbsPath = path.resolve(
        workspace.storageRoot,
        workspace.workspacePath,
      );

      const validation = validatePrePdfCheckJson(rawText);

      const mdContent = this.buildMarkdown(
        rawText,
        validation.data ?? null,
        validation.rejectedFieldPaths ?? [],
        workspace.company.nameOriginal,
        workspace.jobVacancy.roleTitleOriginal,
      );

      const { filePath: mdPath, hash: mdHash } =
        await this.artifactStorage.writeFile(
          workspaceAbsPath,
          '03_pre_pdf_check.md',
          mdContent,
        );

      const mdArtifact = await this.artifactsService.register({
        workspaceId,
        promptRunId: promptRun.id,
        artifactType: 'pre_pdf_check_md',
        canonicalFileName: '03_pre_pdf_check.md',
        filePath: mdPath,
        storageRoot: workspace.storageRoot,
        contentHash: mdHash,
        origin: 'prompt_3',
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
          '03_pre_pdf_check.json',
          jsonContent,
        );

      const jsonArtifact = await this.artifactsService.register({
        workspaceId,
        promptRunId: promptRun.id,
        artifactType: 'pre_pdf_check_json',
        canonicalFileName: '03_pre_pdf_check.json',
        filePath: jsonPath,
        storageRoot: workspace.storageRoot,
        contentHash: jsonHash,
        origin: 'prompt_3',
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

      // Prompt 3 is an optional quality gate, but running it (or explicitly
      // skipping via ReviewGatesService.skipPrePdfCheck) is what clears the
      // pre_pdf_check_ready -> paused_before_export gate before export. It does
      // not block on the AI's readiness verdict — only on having run.
      await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.pre_pdf_check_ready,
        WorkspaceStatus.paused_before_export,
      );

      return {
        success: true,
        promptRunId: promptRun.id,
        aiRunId: aiRun.id,
        readiness: checkData.readiness,
        artifactPaths: { md: mdPath, json: jsonPath },
      };
    } catch (error) {
      await this.promptRuns.failSafely(promptRun.id);
      throw error;
    }
  }

  private buildMarkdown(
    rawText: string,
    data: PrePdfCheckOutput | null,
    rejectedFieldPaths: string[],
    companyName: string,
    roleTitle: string,
  ): string {
    if (!data) {
      return [
        `# Pre-PDF Check (raw — JSON validation failed)`,
        `## Company: ${companyName} | Role: ${roleTitle}`,
        ``,
        rawText,
      ].join('\n');
    }

    const correctionsBlock =
      data.corrections.length > 0
        ? data.corrections
            .map(
              (c) =>
                `- **${c.field_path}** [${c.severity}] — ${c.reason}\n  Suggested: ${c.suggested_text}` +
                (isCertificationPath(c.field_path)
                  ? `\n  ${CERTIFICATION_NOT_APPLIED_NOTE}`
                  : ''),
            )
            .join('\n')
        : '_No corrections suggested._';

    // Dropped by validatePrePdfCheckJson (outside the correctable fields, ISSUE-492). Listed so
    // a readiness/export_blocked verdict that rested on them is still explained to the human.
    const rejectedBlock =
      rejectedFieldPaths.length > 0
        ? [
            ``,
            `## Rejected Corrections`,
            `Not applied: these field paths are not correctable CV fields. Review the wording by hand if it matters.`,
            ...rejectedFieldPaths.map(
              (fieldPath) => `- ${describeFieldPath(fieldPath)}`,
            ),
          ]
        : [];

    return [
      `# Pre-PDF Check — ${companyName} — ${roleTitle}`,
      ``,
      `## Readiness`,
      data.readiness,
      ``,
      `## Quality Score`,
      String(data.quality_score),
      ``,
      `## Export Blocked`,
      String(data.export_blocked),
      ``,
      `## Corrections`,
      correctionsBlock,
      ...rejectedBlock,
      ``,
      `## Overall Notes`,
      data.overall_notes,
    ].join('\n');
  }
}
