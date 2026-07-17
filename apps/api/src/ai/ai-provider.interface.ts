export interface AiProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  rawJson?: string;
}

export interface AiProviderOptions {
  jsonMode?: boolean;
  step?: string;
}

export interface AiProviderResult {
  text: string;
  parsedJson?: unknown;
  rawResponse?: unknown;
  usage?: AiProviderUsage;
}

export interface AiProvider {
  readonly providerName: string;
  readonly modelName: string;

  complete(
    prompt: string,
    inputContext: string,
    options?: AiProviderOptions,
  ): Promise<AiProviderResult>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
