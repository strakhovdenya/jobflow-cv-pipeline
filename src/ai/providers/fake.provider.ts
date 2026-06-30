import { Injectable } from '@nestjs/common';
import { AiProvider, AiProviderOptions, AiProviderResult } from '../ai-provider.interface';

const FAKE_PROVIDER_NAME = 'fake';
const FAKE_MODEL_NAME = 'fake-model-v1';

const FAKE_RESPONSE_TEXT = `# Vacancy Analysis

## Decision
apply

## Score
75

## Summary
Good match for Node.js/TypeScript backend role.`;

export const FAKE_PROMPT1_JSON = {
  schema_version: '1.0',
  step: 'prompt_1_vacancy_analysis',
  workspace: {
    company_name_original: 'Fake Company',
    company_slug: 'Fake_Company',
    role_title_original: 'Backend Developer',
    role_slug: 'Backend_Developer',
  },
  decision: 'apply',
  score: 75,
  summary: 'Good match for Node.js/TypeScript backend role.',
  must_have: [
    {
      requirement: 'Node.js/TypeScript backend',
      match_level: 'strong',
      evidence_status: 'supported',
      risk: 'low',
      notes: null,
    },
  ],
  nice_to_have: [],
  wishlist: [],
  hidden_role_logic: [],
  tech_stack_match: {
    strong: ['Node.js', 'TypeScript'],
    transferable: ['Azure Functions'],
    weak_or_missing: [],
  },
  language_risk: { risk_level: 'low', notes: 'English B2.' },
  location_risk: { risk_level: 'low', notes: 'Remote confirmed.' },
  evidence_risks: [],
  top_reasons: ['Strong Node.js/TypeScript match.'],
  recommended_next_action: 'Generate targeted CV content.',
  manual_review_required: true,
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
      ? JSON.stringify(FAKE_PROMPT1_JSON, null, 2)
      : FAKE_RESPONSE_TEXT;

    const parsedJson = options?.jsonMode ? FAKE_PROMPT1_JSON : undefined;

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
