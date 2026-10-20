import { Injectable, Logger } from '@nestjs/common';
import {
  AiProviderEmptyResponseError,
  AiProviderRefusalError,
  AiProviderResponseError,
  AiProviderTruncatedError,
} from '../ai/ai-provider.errors';
import { PrismaService } from '../prisma/prisma.service';

export const STEP_FAILURE_STEPS = [
  'prompt_1',
  'prompt_2',
  'prompt_3',
  'prompt_5',
  'cover_letter',
  'export',
] as const;

export type StepFailureStep = (typeof STEP_FAILURE_STEPS)[number];

export const MAX_STEP_ERROR_LENGTH = 500;

const STEP_LABELS: Record<StepFailureStep, string> = {
  prompt_1: 'Vacancy analysis',
  prompt_2: 'CV generation',
  prompt_3: 'Pre-PDF check',
  prompt_5: 'Final check',
  cover_letter: 'Cover letter',
  export: 'PDF export',
};

interface FailureRule {
  isMatch: (error: unknown, message: string) => boolean;
  reason: string;
  // AI-provider rules describe the provider, so they must not label an export (renderer) error.
  isAiOnly: boolean;
}

const statusOf = (error: unknown): number | undefined => {
  if (error && typeof error === 'object' && 'status' in error) {
    const { status } = error as { status: unknown };
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
};

const isNamed = (error: unknown, pattern: RegExp): boolean =>
  error instanceof Error && pattern.test(error.name);

// Ordered: the first matching rule wins. Provider SDK errors are recognised by their HTTP status,
// class name or exact message (never by importing the SDK), the provider's own error classes by
// type. The messages are matched whole so that a database or filesystem error that merely
// contains "timed out" or "connection" is not labelled as an AI provider problem.
const FAILURE_RULES: FailureRule[] = [
  {
    isMatch: (error, message) =>
      [401, 403].includes(statusOf(error) ?? 0) ||
      /incorrect api key|invalid api key|unauthorized/i.test(message),
    reason: 'the AI provider rejected the request (check the API key)',
    isAiOnly: true,
  },
  {
    isMatch: (error, message) =>
      statusOf(error) === 429 || /rate limit/i.test(message),
    reason: 'the AI provider rate limit was reached, wait a minute',
    isAiOnly: true,
  },
  {
    isMatch: (error, message) =>
      isNamed(error, /timeout/i) || /^request timed out\.?$/i.test(message),
    reason: 'the AI provider did not answer in time',
    isAiOnly: true,
  },
  {
    isMatch: (error, message) =>
      isNamed(error, /connection/i) ||
      /^(?:connection error|fetch failed)\.?$/i.test(message),
    reason: 'the AI provider could not be reached (network error)',
    isAiOnly: true,
  },
  {
    isMatch: (error) => error instanceof AiProviderTruncatedError,
    reason: 'the AI answer was cut off at the output limit',
    isAiOnly: true,
  },
  {
    isMatch: (error) => error instanceof AiProviderRefusalError,
    reason: 'the AI provider declined to answer',
    isAiOnly: true,
  },
  {
    isMatch: (error) => error instanceof AiProviderEmptyResponseError,
    reason: 'the AI provider returned an empty answer',
    isAiOnly: true,
  },
  {
    isMatch: (error) => error instanceof AiProviderResponseError,
    reason: 'the AI answer was not valid JSON',
    isAiOnly: true,
  },
  {
    isMatch: (_error, message) => /puppeteer|chrom(e|ium)/i.test(message),
    reason: 'the PDF renderer (Chromium) could not run',
    isAiOnly: false,
  },
];

const SECRET_PATTERNS: RegExp[] = [
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}/g,
  /\bBearer\s+\S+/gi,
  /\bBasic\s+[A-Za-z0-9+/=]{8,}/gi,
  /\bAIza[\w-]{20,}/g,
  /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/gi,
  /[\w-]*(?:api[_-]?key|token|secret|password)[\w-]*["']?\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s"',;]+)/gi,
];

const STACK_FRAME = /^at\s/;

const truncate = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

// An Error message keeps only its first line (the rest is usually a stack trace); a reason the
// pipeline composed itself keeps all lines, joined. Any secret-looking token is masked before the
// text can reach the database or the UI.
const sanitizeReason = (message: string, isComposed: boolean): string => {
  const lines = message.split('\n');
  const text = isComposed
    ? lines
        .map((line) => line.trim())
        .filter((line) => line !== '' && !STACK_FRAME.test(line))
        .join(' ')
    : (lines[0] ?? '');
  const masked = SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, '[redacted]'),
    text,
  );
  return masked.trim();
};

export const describeStepFailure = (
  step: StepFailureStep,
  error: unknown,
): string => {
  const message = error instanceof Error ? error.message : String(error);
  const label = STEP_LABELS[step];
  // A plain string is a reason the pipeline composed itself (e.g. a validation message); it is
  // shown as is, not matched against provider-error patterns.
  const rule =
    typeof error === 'string'
      ? undefined
      : FAILURE_RULES.find(
          (candidate) =>
            (step !== 'export' || !candidate.isAiOnly) &&
            candidate.isMatch(error, message),
        );
  const text = rule
    ? `${label} failed: ${rule.reason}. Retry the step.`
    : `${label} failed: ${sanitizeReason(message, typeof error === 'string') || 'unknown error'}`;
  return truncate(text, MAX_STEP_ERROR_LENGTH);
};

// The only writer of ApplicationWorkspace.lastStepError* (ISSUE-307). Neither method ever throws:
// recording the reason a step failed must not mask the step's own error, and clearing it must not
// block a step that is about to run.
@Injectable()
export class StepFailureService {
  private readonly logger = new Logger(StepFailureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    workspaceId: string,
    step: StepFailureStep,
    error: unknown,
  ): Promise<void> {
    try {
      await this.prisma.applicationWorkspace.update({
        where: { id: workspaceId },
        data: {
          lastStepErrorStep: step,
          lastStepErrorMessage: describeStepFailure(step, error),
          lastStepErrorAt: new Date(),
        },
      });
    } catch (recordError) {
      this.logger.warn(
        `Could not record the "${step}" failure of workspace "${workspaceId}": ${
          recordError instanceof Error
            ? recordError.message
            : String(recordError)
        }`,
      );
    }
  }

  // Clears only the error recorded by this same step: a step that starts must not erase another
  // step's failure reason. A workspace without such an error is not written to (no updatedAt bump).
  async clear(workspaceId: string, step: StepFailureStep): Promise<void> {
    try {
      await this.prisma.applicationWorkspace.updateMany({
        where: { id: workspaceId, lastStepErrorStep: step },
        data: {
          lastStepErrorStep: null,
          lastStepErrorMessage: null,
          lastStepErrorAt: null,
        },
      });
    } catch (clearError) {
      this.logger.warn(
        `Could not clear the last step error of workspace "${workspaceId}": ${
          clearError instanceof Error ? clearError.message : String(clearError)
        }`,
      );
    }
  }
}
