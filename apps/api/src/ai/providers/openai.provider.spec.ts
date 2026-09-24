import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiProviderResponseError } from '../ai-provider.errors';
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
      get: jest.fn((): undefined => undefined),
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

  it('throws a typed AiProviderResponseError, keeping the parse error as cause, when JSON mode gets a non-JSON answer', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Sure! Here is your analysis: ...' } }],
      usage: undefined,
    });

    const error = await provider
      .complete('prompt', 'context', { jsonMode: true })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiProviderResponseError);
    expect((error as AiProviderResponseError).cause).toBeInstanceOf(
      SyntaxError,
    );
    expect((error as Error).message).toContain('non-JSON');
  });

  it('does not try to parse the answer when neither jsonMode nor jsonSchema is requested', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json at all' } }],
      usage: undefined,
    });

    await expect(provider.complete('prompt', 'context')).resolves.toEqual(
      expect.objectContaining({ text: 'not json at all' }),
    );
  });

  it('passes the configured timeout and maxRetries to the OpenAI client', () => {
    const tunedConfig = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_TIMEOUT_MS') return 30000;
        if (key === 'OPENAI_MAX_RETRIES') return 0;
        return undefined;
      }),
    } as unknown as ConfigService;

    new OpenAiProvider(tunedConfig);

    expect(OpenAI).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeout: 30000, maxRetries: 0 }),
    );
  });

  it('falls back to a bounded default timeout and retry count when they are not configured', () => {
    expect(OpenAI).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeout: 120000, maxRetries: 2 }),
    );
  });

  it('requests strict json_schema mode when jsonSchema is provided, preferring it over jsonMode', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"readiness":"ready"}' } }],
      usage: undefined,
    });

    const schema = { type: 'object', properties: {} };

    const result = await provider.complete('prompt', 'context', {
      jsonMode: true,
      jsonSchema: { name: 'pre_pdf_check_output', schema },
      step: 'prompt_3',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'pre_pdf_check_output',
            schema,
            strict: true,
          },
        },
      }),
    );
    expect(result.parsedJson).toEqual({ readiness: 'ready' });
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
