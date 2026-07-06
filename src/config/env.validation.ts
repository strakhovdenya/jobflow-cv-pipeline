import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().optional(),
  STORAGE_ROOT: Joi.string().required(),
  LOG_LEVEL: Joi.string().default('info'),
  CORS_ORIGIN: Joi.string().optional(),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  AI_PROVIDER: Joi.string().valid('fake', 'openai').default('fake'),
  OPENAI_API_KEY: Joi.string().optional(),
  OPENAI_MODEL: Joi.string().optional(),
  AI_PROVIDER_DEFAULT: Joi.string().optional(),
  AI_MODEL_DEFAULT: Joi.string().optional(),
});
