import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  AiProviderOptions,
  AiProviderResult,
} from '../ai-provider.interface';

const FAKE_PROVIDER_NAME = 'fake';
const FAKE_MODEL_NAME = 'fake-model-v1';

const FAKE_RESPONSE_TEXT = `# Vacancy Analysis

## Decision
apply

## Score
75

## Summary
Good match for the role.`;

const FAKE_RESPONSE_JSON = {
  schema_version: '1.0',
  step: 'prompt_1_vacancy_analysis',
  decision: 'apply',
  score: 75,
  summary: 'Good match for the role.',
};

@Injectable()
export class FakeAiProvider implements AiProvider {
  readonly providerName = FAKE_PROVIDER_NAME;
  readonly modelName = FAKE_MODEL_NAME;

  async complete(
    _prompt: string,
    _inputContext: string,
    options?: AiProviderOptions,
  ): Promise<AiProviderResult> {
    const text = options?.jsonMode
      ? JSON.stringify(FAKE_RESPONSE_JSON, null, 2)
      : FAKE_RESPONSE_TEXT;

    const parsedJson = options?.jsonMode ? FAKE_RESPONSE_JSON : undefined;

    return {
      text,
      parsedJson,
      rawResponse: { fake: true },
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
    };
  }
}
