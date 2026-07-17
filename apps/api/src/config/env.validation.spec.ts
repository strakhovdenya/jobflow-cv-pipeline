import * as Joi from 'joi';
import { envValidationSchema } from './env.validation';

const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  STORAGE_ROOT: '/tmp/storage',
  API_KEY: 'test-api-key',
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
      IMPORT_ROOT: '/tmp/legacy-applications',
    });
    expect(error).toBeUndefined();
  });

  it('passes without IMPORT_ROOT (optional, only required by the import scan endpoint)', () => {
    const { error } = validate(VALID_ENV);
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
      API_KEY: 'test-api-key',
    });
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/STORAGE_ROOT/);
  });

  it('fails when API_KEY is missing', () => {
    const { error } = validate({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      STORAGE_ROOT: '/tmp/storage',
    });
    expect(error).toBeDefined();
    expect(error!.message).toMatch(/API_KEY/);
  });

  it('fails when all required fields are missing', () => {
    const { error } = validate({});
    expect(error).toBeDefined();
    const details = error!.details.map(
      (d: Joi.ValidationErrorItem) => d.context?.key,
    );
    expect(details).toContain('DATABASE_URL');
    expect(details).toContain('STORAGE_ROOT');
    expect(details).toContain('API_KEY');
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
