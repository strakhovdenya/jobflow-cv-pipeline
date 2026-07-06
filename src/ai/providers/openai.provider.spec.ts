import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('OpenAiProvider', () => {
  let provider: OpenAiProvider;
  let configService: ConfigService;

  beforeEach(() => {
    mockCreate.mockReset();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-key';
        if (key === 'OPENAI_MODEL') return 'gpt-4o-test';
        return undefined;
      }),
    } as unknown as ConfigService;
    provider = new OpenAiProvider(configService);
  });

  it('has the expected provider name and configured model name', () => {
    expect(provider.providerName).toBe('openai');
    expect(provider.modelName).toBe('gpt-4o-test');
  });

  it('falls back to a default model name when OPENAI_MODEL is not set', () => {
    const fallbackConfig = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    const fallbackProvider = new OpenAiProvider(fallbackConfig);

    expect(fallbackProvider.modelName).toBe('gpt-4o');
  });

  it('maps a mocked OpenAI response into AiProviderResult (text mode)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'plain text response' } }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    const result = await provider.complete('system prompt', 'user context');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-test',
        messages: [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: 'user context' },
        ],
      }),
    );
    expect(result.text).toBe('plain text response');
    expect(result.parsedJson).toBeUndefined();
    expect(result.usage).toEqual(
      expect.objectContaining({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }),
    );
  });

  it('requests JSON mode and parses the response when jsonMode is enabled', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"decision":"apply","score":80}' } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        prompt_tokens_details: { cached_tokens: 2 },
        completion_tokens_details: { reasoning_tokens: 1 },
      },
    });

    const result = await provider.complete('prompt', 'context', {
      jsonMode: true,
      step: 'prompt_1',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' },
      }),
    );
    expect(result.parsedJson).toEqual({ decision: 'apply', score: 80 });
    expect(result.usage).toEqual(
      expect.objectContaining({
        cachedInputTokens: 2,
        reasoningTokens: 1,
      }),
    );
  });

  it('returns undefined usage when the OpenAI response has no usage field', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'no usage here' } }],
      usage: undefined,
    });

    const result = await provider.complete('prompt', 'context');

    expect(result.usage).toBeUndefined();
  });
});
