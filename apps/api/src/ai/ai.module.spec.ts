import { ConfigService } from '@nestjs/config';
import { createAiProvider } from './ai.module';
import { FakeAiProvider } from './providers/fake.provider';
import { OpenAiProvider } from './providers/openai.provider';

describe('createAiProvider', () => {
  function configWith(aiProvider: string | undefined): ConfigService {
    return {
      get: jest.fn((key: string) => {
        if (key === 'AI_PROVIDER') return aiProvider;
        if (key === 'OPENAI_API_KEY') return 'test-key';
        return undefined;
      }),
    } as unknown as ConfigService;
  }

  it('returns FakeAiProvider when AI_PROVIDER is unset', () => {
    const provider = createAiProvider(configWith(undefined));

    expect(provider).toBeInstanceOf(FakeAiProvider);
  });

  it('returns FakeAiProvider when AI_PROVIDER is "fake"', () => {
    const provider = createAiProvider(configWith('fake'));

    expect(provider).toBeInstanceOf(FakeAiProvider);
  });

  it('returns OpenAiProvider when AI_PROVIDER is "openai"', () => {
    const provider = createAiProvider(configWith('openai'));

    expect(provider).toBeInstanceOf(OpenAiProvider);
  });
});
