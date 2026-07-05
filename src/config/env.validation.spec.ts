import * as Joi from 'joi';
import { envValidationSchema } from './env.validation';

const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  STORAGE_ROOT: '/tmp/storage',
};

describe('envValidationSchema', () => {
  const validate = (env: Record<string, unknown>) =>
    envValidationSchema.validate(env, { abortEarly: false });

  it('passes with only required fields present', () => {
    const { error, value } = validate(VALID_ENV);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.LOG_LEVEL).toBe('info');
    expect(value.THROTTLE_TTL).toBe(60);
    expect(value.THROTTLE_LIMIT).toBe(100);
  });

  it('passes with all fields provided', () => {
    const { error } = validate({
      ...VALID_ENV,
      PORT: 4000,
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn',
      CORS_ORIGIN: 'https://example.com',
      THROTTLE_TTL: 120,
      THROTTLE_LIMIT: 200,
    });
    expect(error).toBeUndefined();
  });

  it('fails when DATABASE_URL is missing', () => {
    const { error } = validate({ STORAGE_ROOT: '/tmp/storage' });
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/DATABASE_URL/);
  });

  it('fails when STORAGE_ROOT is missing', () => {
    const { error } = validate({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    });
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/STORAGE_ROOT/);
  });

  it('fails when both required fields are missing', () => {
    const { error } = validate({});
    expect(error).toBeDefined();
    const details = error!.details.map((d: Joi.ValidationErrorItem) => d.context?.key);
    expect(details).toContain('DATABASE_URL');
    expect(details).toContain('STORAGE_ROOT');
  });

  it('applies default PORT 3000 when not set', () => {
    const { value } = validate(VALID_ENV);
    expect(value.PORT).toBe(3000);
  });

  it('applies default LOG_LEVEL info when not set', () => {
    const { value } = validate(VALID_ENV);
    expect(value.LOG_LEVEL).toBe('info');
  });
});
