import * as Joi from 'joi';

export const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 50_000;

// Defaults sized from the observed AiRun.outputTokens maximum per step with roughly 2x headroom
// (reasoning tokens are not recorded in AiRun yet, so the margin must cover them). Env variable
// is OPENAI_MAX_OUTPUT_TOKENS_<STEP uppercased>.
export const OPENAI_STEP_MAX_OUTPUT_TOKENS: Readonly<Record<string, number>> =
  Object.freeze({
    prompt_1: 16_000,
    prompt_2: 50_000,
    prompt_3: 10_000,
    prompt_5: 6_000,
    skip_reason: 6_000,
    cover_letter: 6_000,
    // ADR-046 (ISSUE-713): the stage keys of the experimental analysis, each with its own cap.
    // Not yet measured; X1 extracts requirements only, X2 and B also write the evidence map.
    analysis_x1: 8_000,
    analysis_x2: 24_000,
    analysis_b: 24_000,
  });

export const stepMaxOutputTokensKey = (step: string): string =>
  `OPENAI_MAX_OUTPUT_TOKENS_${step.toUpperCase()}`;

// The cap the provider applies to a call of `step`: the configured per-step value for a listed
// step, the global cap otherwise. Experimental stages record it in their stage identity.
export const resolveStepMaxOutputTokens = (
  readConfig: (key: string) => number | undefined,
  step: string | undefined,
): number => {
  const isListedStep =
    step !== undefined &&
    Object.prototype.hasOwnProperty.call(OPENAI_STEP_MAX_OUTPUT_TOKENS, step);
  if (isListedStep) {
    return (
      readConfig(stepMaxOutputTokensKey(step)) ??
      OPENAI_STEP_MAX_OUTPUT_TOKENS[step]
    );
  }
  return (
    readConfig('OPENAI_MAX_OUTPUT_TOKENS') ?? DEFAULT_OPENAI_MAX_OUTPUT_TOKENS
  );
};

const positiveTokens = (defaultValue: number) =>
  Joi.number().integer().positive().default(defaultValue);

const stepMaxOutputTokensSchema = Object.fromEntries(
  Object.entries(OPENAI_STEP_MAX_OUTPUT_TOKENS).map(([step, limit]) => [
    stepMaxOutputTokensKey(step),
    positiveTokens(limit),
  ]),
);

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  API_KEY: Joi.string().required(),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('127.0.0.1'),
  NODE_ENV: Joi.string().optional(),
  STORAGE_ROOT: Joi.string().required(),
  KNOWLEDGE_SOURCES_ROOT: Joi.string().required(),
  IMPORT_ROOT: Joi.string().optional(),
  LOG_LEVEL: Joi.string().default('info'),
  CORS_ORIGIN: Joi.string().optional(),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  THROTTLE_AI_STEP_LIMIT: Joi.number().integer().positive().default(10),
  AI_PROVIDER: Joi.string()
    .valid('fake', 'openai')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('fake'),
    }),
  OPENAI_API_KEY: Joi.string().when('AI_PROVIDER', {
    is: 'openai',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  OPENAI_MODEL: Joi.string().optional(),
  OPENAI_TIMEOUT_MS: Joi.number().integer().positive().default(120000),
  OPENAI_MAX_RETRIES: Joi.number().integer().min(0).default(2),
  OPENAI_MAX_OUTPUT_TOKENS: positiveTokens(DEFAULT_OPENAI_MAX_OUTPUT_TOKENS),
  ...stepMaxOutputTokensSchema,
  AI_PROVIDER_DEFAULT: Joi.string().optional(),
  AI_MODEL_DEFAULT: Joi.string().optional(),
  REDIS_URL: Joi.string().optional(),
  QUEUE_PREFIX: Joi.string().optional(),
});
