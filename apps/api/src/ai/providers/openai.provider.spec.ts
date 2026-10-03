import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiProviderEmptyResponseError,
  AiProviderRefusalError,
  AiProviderResponseError,
  AiProviderTruncatedError,
} from '../ai-provider.errors';
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

  it('passes the configured timeout to the OpenAI client and disables SDK-level retries', () => {
    const tunedConfig = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_TIMEOUT_MS') return 30000;
        return undefined;
      }),
    } as unknown as ConfigService;

    new OpenAiProvider(tunedConfig);

    expect(OpenAI).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeout: 30000, maxRetries: 0 }),
    );
  });

  it('falls back to a bounded default timeout and keeps SDK-level retries disabled when not configured', () => {
    expect(OpenAI).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeout: 120000, maxRetries: 0 }),
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

  describe('call policy', () => {
    const okResponse = (content = 'answer') => ({
      choices: [{ finish_reason: 'stop', message: { content } }],
      usage: undefined,
    });
    const httpError = (status: number) =>
      Object.assign(new Error(`HTTP ${status}`), { status });

    const providerWith = (values: Record<string, unknown>) =>
      new OpenAiProvider({
        get: jest.fn((key: string) => values[key]),
      } as unknown as ConfigService);

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const settle = async <T>(promise: Promise<T>) => {
      const outcome = promise.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
      await jest.runAllTimersAsync();
      return outcome;
    };

    it('does not retry after timeout', async () => {
      const timeout = Object.assign(new Error('Request timed out.'), {
        name: 'APIConnectionTimeoutError',
      });
      mockCreate.mockRejectedValue(timeout);

      const outcome = await settle(
        providerWith({ OPENAI_MAX_RETRIES: 2 }).complete('p', 'c'),
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(outcome).toEqual({ error: timeout });
    });

    it('retries pre-generation errors within limit', async () => {
      mockCreate
        .mockRejectedValueOnce(httpError(429))
        .mockResolvedValueOnce(okResponse('after retry'));

      const outcome = await settle(
        providerWith({ OPENAI_MAX_RETRIES: 1 }).complete('p', 'c'),
      );

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(outcome).toEqual({
        value: expect.objectContaining({ text: 'after retry' }),
      });
    });

    it('stops retrying at configured limit', async () => {
      const failure = httpError(429);
      mockCreate.mockRejectedValue(failure);

      const outcome = await settle(
        providerWith({ OPENAI_MAX_RETRIES: 2 }).complete('p', 'c'),
      );

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(outcome).toEqual({ error: failure });
    });

    it('waits for the Retry-After delay before retrying a 429', async () => {
      const rateLimited = Object.assign(httpError(429), {
        headers: new Headers({ 'retry-after': '5' }),
      });
      mockCreate
        .mockRejectedValueOnce(rateLimited)
        .mockResolvedValueOnce(okResponse('after wait'));

      const pending = providerWith({ OPENAI_MAX_RETRIES: 1 }).complete(
        'p',
        'c',
      );
      await jest.advanceTimersByTimeAsync(4_999);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toEqual(
        expect.objectContaining({ text: 'after wait' }),
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('caps an excessive Retry-After delay', async () => {
      const rateLimited = Object.assign(httpError(429), {
        headers: new Headers({ 'retry-after': '3600' }),
      });
      mockCreate
        .mockRejectedValueOnce(rateLimited)
        .mockResolvedValueOnce(okResponse());

      const pending = providerWith({ OPENAI_MAX_RETRIES: 1 }).complete(
        'p',
        'c',
      );
      await jest.advanceTimersByTimeAsync(60_000);

      await expect(pending).resolves.toEqual(
        expect.objectContaining({ text: 'answer' }),
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('does not retry client errors other than 429', async () => {
      mockCreate.mockRejectedValue(httpError(400));

      await settle(providerWith({ OPENAI_MAX_RETRIES: 2 }).complete('p', 'c'));

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('throws truncation error on length finish reason', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ finish_reason: 'length', message: { content: '{"a"' } }],
      });

      await expect(provider.complete('p', 'c')).rejects.toBeInstanceOf(
        AiProviderTruncatedError,
      );
    });

    it('throws refusal error', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: null, refusal: 'I cannot help' },
          },
        ],
      });

      await expect(provider.complete('p', 'c')).rejects.toBeInstanceOf(
        AiProviderRefusalError,
      );
    });

    it('does not throw refusal error when refusal is null', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: 'fine', refusal: null },
          },
        ],
      });

      await expect(provider.complete('p', 'c')).resolves.toEqual(
        expect.objectContaining({ text: 'fine' }),
      );
    });

    it('throws on empty content', async () => {
      mockCreate.mockResolvedValue(okResponse(''));

      await expect(provider.complete('p', 'c')).rejects.toBeInstanceOf(
        AiProviderEmptyResponseError,
      );
    });

    it('returns text on stop finish reason', async () => {
      mockCreate.mockResolvedValue(okResponse('final text'));

      await expect(provider.complete('p', 'c')).resolves.toEqual(
        expect.objectContaining({ text: 'final text' }),
      );
    });

    it('uses per-step max_completion_tokens', async () => {
      mockCreate.mockResolvedValue(okResponse());

      await providerWith({
        OPENAI_MAX_OUTPUT_TOKENS: 1000,
        OPENAI_MAX_OUTPUT_TOKENS_PROMPT_3: 777,
      }).complete('p', 'c', { step: 'prompt_3' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_completion_tokens: 777 }),
      );
    });

    it('falls back to global max_completion_tokens', async () => {
      mockCreate.mockResolvedValue(okResponse());

      await providerWith({ OPENAI_MAX_OUTPUT_TOKENS: 1234 }).complete(
        'p',
        'c',
        { step: 'unknown_step' },
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_completion_tokens: 1234 }),
      );
    });

    it('uses global max_completion_tokens without step', async () => {
      mockCreate.mockResolvedValue(okResponse());

      await providerWith({ OPENAI_MAX_OUTPUT_TOKENS: 4321 }).complete('p', 'c');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_completion_tokens: 4321 }),
      );
    });
  });
});
