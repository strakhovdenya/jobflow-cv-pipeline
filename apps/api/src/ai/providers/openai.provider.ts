import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiProviderEmptyResponseError,
  AiProviderRefusalError,
  AiProviderResponseError,
  AiProviderTruncatedError,
} from '../ai-provider.errors';
import {
  AiProvider,
  AiProviderOptions,
  AiProviderResult,
  AiProviderUsage,
} from '../ai-provider.interface';
import {
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  OPENAI_STEP_MAX_OUTPUT_TOKENS,
  stepMaxOutputTokensKey,
} from '../../config/env.validation';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;

// Only failures that happen before generation starts are safe to repeat: a timeout may
// already have been billed, and the AI-step queue itself never retries (ADR-040).
const isPreGenerationError = (error: unknown): boolean => {
  const status = (error as { status?: unknown } | null)?.status;
  return (
    typeof status === 'number' &&
    (status === HTTP_TOO_MANY_REQUESTS || status >= HTTP_SERVER_ERROR_MIN)
  );
};

const MAX_RETRY_DELAY_MS = 60_000;
const MS_PER_SECOND = 1000;

// The SDK no longer retries (maxRetries: 0), so the server's requested wait on a 429 has to be
// honoured here; otherwise every retry lands inside the same rate-limit window.
const readRetryAfterMs = (error: unknown): number | undefined => {
  const headers = (error as { headers?: { get?: unknown } } | null)?.headers;
  if (typeof headers?.get !== 'function') return undefined;
  const read = (name: string): string | null =>
    (headers as { get(name: string): string | null }).get(name);
  const ms = Number(read('retry-after-ms'));
  if (Number.isFinite(ms) && ms > 0) return ms;
  const seconds = Number(read('retry-after'));
  if (Number.isFinite(seconds) && seconds > 0) return seconds * MS_PER_SECOND;
  return undefined;
};

const retryDelayMs = (error: unknown, attempt: number): number => {
  const backoffMs = RETRY_BASE_DELAY_MS * 2 ** attempt;
  const requestedMs = readRetryAfterMs(error) ?? 0;
  return Math.min(Math.max(backoffMs, requestedMs), MAX_RETRY_DELAY_MS);
};

const sleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly providerName = 'openai';
  readonly modelName: string;

  private readonly client: OpenAI;
  private readonly maxRetries: number;
  private readonly maxOutputTokens: number;
  private readonly stepMaxOutputTokens: ReadonlyMap<string, number>;

  constructor(configService: ConfigService) {
    this.modelName = configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o';
    this.client = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY'),
      timeout:
        configService.get<number>('OPENAI_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS,
      maxRetries: 0,
    });
    this.maxRetries =
      configService.get<number>('OPENAI_MAX_RETRIES') ?? DEFAULT_MAX_RETRIES;
    this.maxOutputTokens =
      configService.get<number>('OPENAI_MAX_OUTPUT_TOKENS') ??
      DEFAULT_OPENAI_MAX_OUTPUT_TOKENS;
    this.stepMaxOutputTokens = new Map(
      Object.entries(OPENAI_STEP_MAX_OUTPUT_TOKENS).map(([step, fallback]) => [
        step,
        configService.get<number>(stepMaxOutputTokensKey(step)) ?? fallback,
      ]),
    );
  }

  async complete(
    prompt: string,
    inputContext: string,
    options?: AiProviderOptions,
  ): Promise<AiProviderResult> {
    const response = await this.createWithRetry({
      model: this.modelName,
      max_completion_tokens: this.resolveMaxOutputTokens(options?.step),
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: inputContext },
      ],
      ...(options?.jsonSchema
        ? {
            response_format: {
              type: 'json_schema' as const,
              json_schema: {
                name: options.jsonSchema.name,
                schema: options.jsonSchema.schema,
                strict: options.jsonSchema.strict ?? true,
              },
            },
          }
        : options?.jsonMode
          ? { response_format: { type: 'json_object' as const } }
          : {}),
    });

    const text = this.extractText(response);
    const usage = this.mapUsage(response.usage);

    let parsedJson: unknown;
    if (options?.jsonMode || options?.jsonSchema) {
      parsedJson = this.parseJsonResponse(text);
    }

    return {
      text,
      parsedJson,
      rawResponse: response,
      usage,
    };
  }

  private resolveMaxOutputTokens(step: string | undefined): number {
    return (
      (step === undefined ? undefined : this.stepMaxOutputTokens.get(step)) ??
      this.maxOutputTokens
    );
  }

  private async createWithRetry(
    params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  ): Promise<OpenAI.Chat.ChatCompletion> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.client.chat.completions.create(params);
      } catch (error) {
        if (attempt >= this.maxRetries || !isPreGenerationError(error)) {
          throw error;
        }
        await sleep(retryDelayMs(error, attempt));
      }
    }
  }

  private extractText(response: OpenAI.Chat.ChatCompletion): string {
    const choice = response.choices[0];
    const context = `model "${this.modelName}"`;
    if (choice?.finish_reason === 'length') {
      throw new AiProviderTruncatedError(
        `OpenAI response was cut off at the output token limit (${context})`,
      );
    }
    if (choice?.message?.refusal) {
      throw new AiProviderRefusalError(
        `OpenAI refused to answer (${context}): ${choice.message.refusal}`,
      );
    }
    const text = choice?.message?.content;
    if (!text) {
      throw new AiProviderEmptyResponseError(
        `OpenAI returned an empty response (${context})`,
      );
    }
    return text;
  }

  private parseJsonResponse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new AiProviderResponseError(
        `OpenAI returned a non-JSON response although JSON output was requested (model "${this.modelName}", ${text.length} chars)`,
        { cause: error },
      );
    }
  }

  private mapUsage(
    usage: OpenAI.CompletionUsage | undefined,
  ): AiProviderUsage | undefined {
    if (!usage) {
      return undefined;
    }

    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cachedInputTokens: usage.prompt_tokens_details?.cached_tokens,
      reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
      rawJson: JSON.stringify(usage),
    };
  }
}
