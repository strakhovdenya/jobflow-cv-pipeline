import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiProvider,
  AiProviderOptions,
  AiProviderResult,
  AiProviderUsage,
} from '../ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly providerName = 'openai';
  readonly modelName: string;

  private readonly client: OpenAI;

  constructor(configService: ConfigService) {
    this.modelName = configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o';
    this.client = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async complete(
    prompt: string,
    inputContext: string,
    options?: AiProviderOptions,
  ): Promise<AiProviderResult> {
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: inputContext },
      ],
      ...(options?.jsonMode
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    });

    const text = response.choices[0]?.message?.content ?? '';
    const usage = this.mapUsage(response.usage);

    let parsedJson: unknown;
    if (options?.jsonMode) {
      parsedJson = JSON.parse(text);
    }

    return {
      text,
      parsedJson,
      rawResponse: response,
      usage,
    };
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
