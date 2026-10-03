import { applyDecorators, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, ThrottlerModuleOptions } from '@nestjs/throttler';

export const DEFAULT_THROTTLER = 'default';
export const AI_STEP_THROTTLER = 'ai-step';

const AI_STEP_THROTTLE_KEY = 'throttle:ai-step';

const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_LIMIT = 100;
const DEFAULT_AI_STEP_LIMIT = 10;
const MS_PER_SECOND = 1000;

// Marks an AI step enqueue route: counted only by the `ai-step` throttler,
// never by the general one.
export const AiStepThrottle = () =>
  applyDecorators(
    SetMetadata(AI_STEP_THROTTLE_KEY, true),
    SkipThrottle({ [DEFAULT_THROTTLER]: true }),
  );

const isNotAiStepRoute = (context: ExecutionContext) =>
  Reflect.getMetadata(AI_STEP_THROTTLE_KEY, context.getHandler()) !== true;

// One counter for all AI step routes of a client; the default key also
// includes the handler, which would multiply the limit by the route count.
const sharedAiStepKey = (
  _context: ExecutionContext,
  tracker: string,
  throttlerName: string,
) => `${throttlerName}-${tracker}`;

export const createThrottlerOptions = (
  cfg: ConfigService,
): ThrottlerModuleOptions => {
  const ttl =
    cfg.get<number>('THROTTLE_TTL', DEFAULT_TTL_SECONDS) * MS_PER_SECOND;
  return {
    throttlers: [
      {
        name: DEFAULT_THROTTLER,
        ttl,
        limit: cfg.get<number>('THROTTLE_LIMIT', DEFAULT_LIMIT),
      },
      {
        name: AI_STEP_THROTTLER,
        ttl,
        limit: cfg.get<number>('THROTTLE_AI_STEP_LIMIT', DEFAULT_AI_STEP_LIMIT),
        skipIf: isNotAiStepRoute,
        generateKey: sharedAiStepKey,
      },
    ],
  };
};
