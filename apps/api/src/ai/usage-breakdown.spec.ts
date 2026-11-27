import {
  emptyUsageBreakdown,
  sumUsageBreakdowns,
  toUsageBreakdown,
} from './usage-breakdown';

// The shape of a stored Chat Completions usage object, with synthetic counts: prompt tokens are
// uncached 3 + cache reads 400 + cache writes 1597; completion tokens include 120 reasoning.
const storedUsage = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    prompt_tokens: 2000,
    completion_tokens: 300,
    total_tokens: 2300,
    prompt_tokens_details: {
      cached_tokens: 400,
      cache_write_tokens: 1597,
      audio_tokens: 0,
    },
    completion_tokens_details: {
      reasoning_tokens: 120,
      audio_tokens: 0,
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0,
    },
    ...overrides,
  });

describe('toUsageBreakdown', () => {
  it('separates cache reads from cache writes', () => {
    const breakdown = toUsageBreakdown('openai', storedUsage());

    expect(breakdown).toEqual({
      isMeasured: true,
      inputTokens: 2000,
      cacheReadTokens: 400,
      cacheWriteTokens: 1597,
      outputTokens: 300,
      reasoningTokens: 120,
    });
  });

  it('treats missing cache details as zero', () => {
    const withoutDetails = JSON.stringify({
      prompt_tokens: 900,
      completion_tokens: 80,
      total_tokens: 980,
    });
    const withEmptyDetails = storedUsage({
      prompt_tokens_details: {},
      completion_tokens_details: null,
    });

    for (const raw of [withoutDetails, withEmptyDetails]) {
      const breakdown = toUsageBreakdown('openai', raw);
      expect(breakdown.isMeasured).toBe(true);
      expect(breakdown.cacheReadTokens).toBe(0);
      expect(breakdown.cacheWriteTokens).toBe(0);
      expect(breakdown.reasoningTokens).toBe(0);
    }
    expect(toUsageBreakdown('openai', withoutDetails).inputTokens).toBe(900);
  });

  it('keeps reasoning tokens inside the output tokens', () => {
    const breakdown = toUsageBreakdown('openai', storedUsage());

    expect(breakdown.outputTokens).toBe(300);
    expect(breakdown.inputTokens + breakdown.outputTokens).toBe(2300);
  });

  it('reports a call without recorded usage as unmeasured, not as zero usage', () => {
    const unmeasured = [
      toUsageBreakdown('openai', null),
      toUsageBreakdown('openai', 'not json'),
      toUsageBreakdown('openai', '[]'),
      toUsageBreakdown('openai', JSON.stringify({ total_tokens: 10 })),
      toUsageBreakdown('openai', storedUsage({ prompt_tokens: -1 })),
      toUsageBreakdown('fake', storedUsage()),
    ];

    for (const breakdown of unmeasured) {
      expect(breakdown).toEqual(emptyUsageBreakdown());
      expect(breakdown.isMeasured).toBe(false);
    }
  });
});

describe('sumUsageBreakdowns', () => {
  it('adds measured calls and skips unmeasured ones', () => {
    const measured = toUsageBreakdown('openai', storedUsage());

    const total = sumUsageBreakdowns([
      measured,
      toUsageBreakdown('openai', null),
      measured,
    ]);

    expect(total).toEqual({
      isMeasured: true,
      inputTokens: 4000,
      cacheReadTokens: 800,
      cacheWriteTokens: 3194,
      outputTokens: 600,
      reasoningTokens: 240,
    });
  });

  it('stays unmeasured when no call was measured', () => {
    expect(sumUsageBreakdowns([])).toEqual(emptyUsageBreakdown());
    expect(
      sumUsageBreakdowns([toUsageBreakdown('openai', null)]).isMeasured,
    ).toBe(false);
  });
});
