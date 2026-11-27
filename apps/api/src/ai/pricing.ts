// List-price estimates of stored AI calls (ADR-046 item 11, ISSUE-716). Every figure is an
// estimate at the provider's published list price: never an invoice or a charged amount, and
// nothing here calls a billing API. Measured usage (`usage-breakdown.ts`) stays a separate value;
// a missing price never turns into 0.
//
// Source: OpenAI API pricing, standard processing, read on 2026-11-27 from
// https://developers.openai.com/api/docs/pricing.md and the model pages
// https://developers.openai.com/api/docs/models/gpt-6-luna.md and
// https://developers.openai.com/api/docs/models/gpt-5.6-luna.md.
// Currency USD, prices per 1M tokens. Cache writes use the 30-minute rate (1.25x input): the
// 12-hour lifetime is a Responses API option the application does not use (Chat Completions).
// A request with more than 272K input tokens is billed at the long-context rates for the whole
// request. Reasoning tokens are part of the output tokens and are not priced a second time.

import { UsageBreakdown } from './usage-breakdown';

export const PRICING_TABLE_VERSION = 'openai-standard-2026-11-27';
export const PRICING_CURRENCY = 'USD';
export const PRICING_SOURCE =
  'https://developers.openai.com/api/docs/pricing.md';
export const ESTIMATE_LABEL = 'list-price estimate, not an invoice';

const TOKENS_PER_PRICE_UNIT = 1_000_000;

interface TokenRates {
  inputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
  outputPerMTok: number;
}

interface ModelPrice {
  standard: TokenRates;
  longContext: TokenRates;
  // a request whose input exceeds this many tokens is priced at the long-context rates
  longContextAboveInputTokens: number;
}

const LONG_CONTEXT_ABOVE_INPUT_TOKENS = 272_000;

// Keyed by `<provider>/<model>` as `AiRun` records them.
const MODEL_PRICES: ReadonlyMap<string, ModelPrice> = new Map([
  [
    'openai/gpt-6-luna',
    {
      standard: {
        inputPerMTok: 0.1,
        cacheReadPerMTok: 0.01,
        cacheWritePerMTok: 0.125,
        outputPerMTok: 0.5,
      },
      longContext: {
        inputPerMTok: 0.2,
        cacheReadPerMTok: 0.02,
        cacheWritePerMTok: 0.25,
        outputPerMTok: 0.75,
      },
      longContextAboveInputTokens: LONG_CONTEXT_ABOVE_INPUT_TOKENS,
    },
  ],
  [
    'openai/gpt-5.6-luna',
    {
      standard: {
        inputPerMTok: 0.2,
        cacheReadPerMTok: 0.02,
        cacheWritePerMTok: 0.25,
        outputPerMTok: 1.2,
      },
      longContext: {
        inputPerMTok: 0.4,
        cacheReadPerMTok: 0.04,
        cacheWritePerMTok: 0.5,
        outputPerMTok: 1.8,
      },
      longContextAboveInputTokens: LONG_CONTEXT_ABOVE_INPUT_TOKENS,
    },
  ],
]);

export interface CostEstimate {
  isEstimate: true;
  label: string;
  currency: string;
  pricingVersion: string;
  // null when no estimate can be given; `reason` then says why. Never 0 for "unknown".
  amount: number | null;
  reason: string | null;
}

export interface PricedCall {
  provider: string;
  model: string;
  usage: UsageBreakdown;
}

const estimateOf = (
  amount: number | null,
  reason: string | null,
): CostEstimate => ({
  isEstimate: true,
  label: ESTIMATE_LABEL,
  currency: PRICING_CURRENCY,
  pricingVersion: PRICING_TABLE_VERSION,
  amount,
  reason,
});

const ratesFor = (price: ModelPrice, usage: UsageBreakdown): TokenRates =>
  usage.inputTokens > price.longContextAboveInputTokens
    ? price.longContext
    : price.standard;

type CallPrice =
  | { kind: 'priced'; amount: number }
  | { kind: 'unmeasured' }
  | { kind: 'unpriced'; reason: string };

const priceCall = (call: PricedCall): CallPrice => {
  if (!call.usage.isMeasured) return { kind: 'unmeasured' };
  const price = MODEL_PRICES.get(`${call.provider}/${call.model}`);
  if (!price) {
    return {
      kind: 'unpriced',
      reason: `no list price for model "${call.provider}/${call.model}"`,
    };
  }
  const { inputTokens, cacheReadTokens, cacheWriteTokens, outputTokens } =
    call.usage;
  const uncachedInputTokens = inputTokens - cacheReadTokens - cacheWriteTokens;
  if (uncachedInputTokens < 0) {
    return {
      kind: 'unpriced',
      reason: 'the recorded cache tokens exceed the recorded input tokens',
    };
  }
  const rates = ratesFor(price, call.usage);
  const perUnit =
    uncachedInputTokens * rates.inputPerMTok +
    cacheReadTokens * rates.cacheReadPerMTok +
    cacheWriteTokens * rates.cacheWritePerMTok +
    outputTokens * rates.outputPerMTok;
  return { kind: 'priced', amount: perUnit / TOKENS_PER_PRICE_UNIT };
};

// One estimate over several calls. A call without recorded usage is left out and named in the
// reason (its cost is unknown, not zero); one call without a price makes the whole estimate null.
export const estimateCost = (calls: readonly PricedCall[]): CostEstimate => {
  let amount = 0;
  let unmeasuredCount = 0;
  for (const call of calls) {
    const priced = priceCall(call);
    if (priced.kind === 'unpriced') return estimateOf(null, priced.reason);
    if (priced.kind === 'unmeasured') unmeasuredCount += 1;
    else amount += priced.amount;
  }
  const measuredCount = calls.length - unmeasuredCount;
  if (measuredCount === 0) {
    const reason =
      calls.length === 0
        ? 'no provider call'
        : 'no call of this group has recorded usage';
    return estimateOf(null, reason);
  }
  const reason =
    unmeasuredCount > 0
      ? `covers ${measuredCount} of ${calls.length} calls; ${unmeasuredCount} without recorded usage are not included`
      : null;
  return estimateOf(amount, reason);
};
