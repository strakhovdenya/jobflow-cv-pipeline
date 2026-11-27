import {
  ESTIMATE_LABEL,
  PRICING_CURRENCY,
  PRICING_TABLE_VERSION,
  estimateCost,
} from './pricing';
import {
  UsageBreakdown,
  emptyUsageBreakdown,
  sumUsageBreakdowns,
} from './usage-breakdown';

const usage = (overrides: Partial<UsageBreakdown> = {}): UsageBreakdown => ({
  isMeasured: true,
  inputTokens: 100_000,
  cacheReadTokens: 20_000,
  cacheWriteTokens: 70_000,
  outputTokens: 8_000,
  reasoningTokens: 5_000,
  ...overrides,
});

const call = (model: string, callUsage: UsageBreakdown) => ({
  provider: 'openai',
  model,
  usage: callUsage,
});

describe('estimateCost', () => {
  it('prices input, cache reads, cache writes and output once each', () => {
    const estimate = estimateCost([call('gpt-6-luna', usage())]);

    // uncached 10,000 × $0.10 + reads 20,000 × $0.01 + writes 70,000 × $0.125
    // + output 8,000 × $0.50 (the 5,000 reasoning tokens are inside the output) per 1M tokens.
    const expected =
      (10_000 * 0.1 + 20_000 * 0.01 + 70_000 * 0.125 + 8_000 * 0.5) / 1e6;
    expect(estimate.amount).toBeCloseTo(expected, 12);
    expect(estimate.amount).toBeCloseTo(0.01395, 12);
    expect(estimate.reason).toBeNull();
    expect(estimate).toMatchObject({
      isEstimate: true,
      label: ESTIMATE_LABEL,
      currency: PRICING_CURRENCY,
      pricingVersion: PRICING_TABLE_VERSION,
    });
  });

  it('prices each model by its own rates and sums the calls', () => {
    const estimate = estimateCost([
      call('gpt-6-luna', usage()),
      call(
        'gpt-5.6-luna',
        usage({
          inputTokens: 1_000,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          outputTokens: 1_000,
          reasoningTokens: 0,
        }),
      ),
    ]);

    expect(estimate.amount).toBeCloseTo(
      0.01395 + (1_000 * 0.2 + 1_000 * 1.2) / 1e6,
      12,
    );
  });

  it('applies the long-context rates above the threshold', () => {
    const above = usage({
      inputTokens: 300_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 200_000,
      outputTokens: 10_000,
    });
    const atThreshold = usage({
      inputTokens: 272_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
    });

    expect(estimateCost([call('gpt-6-luna', above)]).amount).toBeCloseTo(
      (100_000 * 0.2 + 200_000 * 0.25 + 10_000 * 0.75) / 1e6,
      12,
    );
    expect(estimateCost([call('gpt-6-luna', atThreshold)]).amount).toBeCloseTo(
      (272_000 * 0.1) / 1e6,
      12,
    );
  });

  it('returns no estimate for an unknown model', () => {
    const measured = usage();

    const estimate = estimateCost([
      call('gpt-6-luna', measured),
      call('unknown-model', measured),
    ]);

    expect(estimate.amount).toBeNull();
    expect(estimate.amount).not.toBe(0);
    expect(estimate.reason).toContain('openai/unknown-model');
    expect(estimate.isEstimate).toBe(true);
    // The measured usage is a separate value and stays reported.
    expect(sumUsageBreakdowns([measured, measured])).toMatchObject({
      isMeasured: true,
      inputTokens: 200_000,
      outputTokens: 16_000,
    });
  });

  it('leaves calls without recorded usage out and says so', () => {
    const estimate = estimateCost([
      call('gpt-6-luna', usage()),
      call('unknown-model', emptyUsageBreakdown()),
    ]);

    expect(estimate.amount).toBeCloseTo(0.01395, 12);
    expect(estimate.reason).toBe(
      'covers 1 of 2 calls; 1 without recorded usage are not included',
    );
  });

  it('gives no estimate when no call has recorded usage', () => {
    const none = estimateCost([]);
    const unmeasured = estimateCost([
      call('gpt-6-luna', emptyUsageBreakdown()),
    ]);

    expect(none).toMatchObject({ amount: null, reason: 'no provider call' });
    expect(unmeasured).toMatchObject({
      amount: null,
      reason: 'no call of this group has recorded usage',
    });
  });

  it('refuses usage whose cache tokens exceed its input', () => {
    const estimate = estimateCost([
      call('gpt-6-luna', usage({ inputTokens: 10, cacheWriteTokens: 70_000 })),
    ]);

    expect(estimate.amount).toBeNull();
    expect(estimate.reason).toContain('exceed');
  });
});
