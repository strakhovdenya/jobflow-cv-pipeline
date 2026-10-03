import { ConfigService } from '@nestjs/config';
import { createThrottlerOptions } from './throttler.config';

const buildOptions = (values: Record<string, number>) => {
  const cfg = new ConfigService(values);
  return createThrottlerOptions(cfg) as {
    throttlers: { name: string; ttl: number; limit: number }[];
  };
};

describe('createThrottlerOptions', () => {
  it('builds the default and ai-step throttlers from config', () => {
    const { throttlers } = buildOptions({
      THROTTLE_TTL: 30,
      THROTTLE_LIMIT: 50,
      THROTTLE_AI_STEP_LIMIT: 4,
    });

    expect(throttlers).toEqual([
      expect.objectContaining({ name: 'default', ttl: 30000, limit: 50 }),
      expect.objectContaining({ name: 'ai-step', ttl: 30000, limit: 4 }),
    ]);
  });

  it('keeps the general limit independent of the AI step limit', () => {
    const base = { THROTTLE_TTL: 60, THROTTLE_LIMIT: 100 };
    const first = buildOptions({ ...base, THROTTLE_AI_STEP_LIMIT: 2 });
    const second = buildOptions({ ...base, THROTTLE_AI_STEP_LIMIT: 99 });

    expect(first.throttlers[0].limit).toBe(100);
    expect(second.throttlers[0].limit).toBe(100);
  });
});
