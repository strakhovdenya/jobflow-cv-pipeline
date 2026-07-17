import { FAKE_SKIP_REASON_JSON, FakeAiProvider } from './fake.provider';

describe('FakeAiProvider', () => {
  let provider: FakeAiProvider;

  beforeEach(() => {
    provider = new FakeAiProvider();
  });

  it('has the expected provider and model names', () => {
    expect(provider.providerName).toBe('fake');
    expect(provider.modelName).toBe('fake-model-v1');
  });

  it('returns a non-empty text response', async () => {
    const result = await provider.complete('analyze this vacancy', 'context');

    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('returns usage data with token counts', async () => {
    const result = await provider.complete('analyze this vacancy', 'context');

    expect(result.usage).toBeDefined();
    expect(result.usage!.inputTokens).toBeGreaterThan(0);
    expect(result.usage!.outputTokens).toBeGreaterThan(0);
    expect(result.usage!.totalTokens).toBe(
      result.usage!.inputTokens! + result.usage!.outputTokens!,
    );
  });

  it('returns parsed JSON when jsonMode is enabled', async () => {
    const result = await provider.complete('analyze this vacancy', 'context', {
      jsonMode: true,
    });

    expect(result.parsedJson).toBeDefined();
    const json = result.parsedJson as Record<string, unknown>;
    expect(json.decision).toBeDefined();
    expect(json.score).toBeDefined();
  });

  it('does not return parsedJson when jsonMode is disabled', async () => {
    const result = await provider.complete('analyze this vacancy', 'context');

    expect(result.parsedJson).toBeUndefined();
  });

  it('returns predictable output on repeated calls', async () => {
    const result1 = await provider.complete('prompt', 'context');
    const result2 = await provider.complete('prompt', 'context');

    expect(result1.text).toBe(result2.text);
    expect(result1.usage?.totalTokens).toBe(result2.usage?.totalTokens);
  });

  it('returns skip reason JSON when step is skip_reason', async () => {
    const result = await provider.complete('skip prompt', 'context', {
      jsonMode: true,
      step: 'skip_reason',
    });

    expect(result.parsedJson).toBeDefined();
    const json = result.parsedJson as typeof FAKE_SKIP_REASON_JSON;
    expect(json.step).toBe('skip_reason');
    expect(json.decision).toBe('skip');
    expect(json.score).toBe(FAKE_SKIP_REASON_JSON.score);
  });
});
