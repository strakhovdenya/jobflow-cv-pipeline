// The provider-neutral token usage of one stored AI call (ADR-046 items 11 and 15, ISSUE-716).
// `AiRun.usageRawJson` holds the provider's own usage object; only this file knows its field
// names. Consumers (the comparison summary, the pricing estimate) read the breakdown only.
//
// Semantics, for every provider mapping:
// - `inputTokens` is the request's whole input: cache reads and cache writes are parts of it;
// - `cacheReadTokens` / `cacheWriteTokens` are input tokens read from / written to the prompt
//   cache, reported separately and never added to the input a second time;
// - `outputTokens` includes the reasoning tokens; `reasoningTokens` is reported as a part of it;
// - `isMeasured: false` means the provider usage was not recorded (no JSON, unknown provider or a
//   JSON without its required counts): every count is then 0 and must not be read as zero usage.

export interface UsageBreakdown {
  isMeasured: boolean;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

type UsageMapper = (usage: Record<string, unknown>) => UsageBreakdown | null;

const UNMEASURED: UsageBreakdown = Object.freeze({
  isMeasured: false,
  inputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const optionalCount = (holder: unknown, key: string): number => {
  if (!isRecord(holder)) return 0;
  const value = holder[key];
  return isCount(value) ? value : 0;
};

// OpenAI Chat Completions `usage` (`openai.provider.ts` stores it as is): `prompt_tokens` counts
// the whole input, cache reads (`cached_tokens`) and cache writes (`cache_write_tokens`) included;
// `completion_tokens` includes `reasoning_tokens` (`total_tokens` = prompt + completion). Missing
// cache or reasoning details count as 0.
const mapOpenAiUsage: UsageMapper = (usage) => {
  const input = usage.prompt_tokens;
  const output = usage.completion_tokens;
  if (!isCount(input) || !isCount(output)) return null;
  return {
    isMeasured: true,
    inputTokens: input,
    cacheReadTokens: optionalCount(
      usage.prompt_tokens_details,
      'cached_tokens',
    ),
    cacheWriteTokens: optionalCount(
      usage.prompt_tokens_details,
      'cache_write_tokens',
    ),
    outputTokens: output,
    reasoningTokens: optionalCount(
      usage.completion_tokens_details,
      'reasoning_tokens',
    ),
  };
};

// One mapping per provider name as `AiRun.provider` records it. A provider without a mapping
// (the fake provider records no usage JSON) is unmeasured.
const USAGE_MAPPERS: ReadonlyMap<string, UsageMapper> = new Map([
  ['openai', mapOpenAiUsage],
]);

export const toUsageBreakdown = (
  provider: string,
  usageRawJson: string | null,
): UsageBreakdown => {
  const mapper = USAGE_MAPPERS.get(provider);
  if (!mapper || usageRawJson === null) return UNMEASURED;
  let parsed: unknown;
  try {
    parsed = JSON.parse(usageRawJson);
  } catch {
    return UNMEASURED;
  }
  if (!isRecord(parsed)) return UNMEASURED;
  return mapper(parsed) ?? UNMEASURED;
};

export const emptyUsageBreakdown = (): UsageBreakdown => ({ ...UNMEASURED });

// The sum of measured calls; unmeasured calls add nothing. `isMeasured` of the sum is true when at
// least one call was measured.
export const sumUsageBreakdowns = (
  items: readonly UsageBreakdown[],
): UsageBreakdown => {
  const total = emptyUsageBreakdown();
  for (const item of items) {
    if (!item.isMeasured) continue;
    total.isMeasured = true;
    total.inputTokens += item.inputTokens;
    total.cacheReadTokens += item.cacheReadTokens;
    total.cacheWriteTokens += item.cacheWriteTokens;
    total.outputTokens += item.outputTokens;
    total.reasoningTokens += item.reasoningTokens;
  }
  return total;
};
