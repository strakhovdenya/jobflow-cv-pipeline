import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const buildContext = (headers: Record<string, string | undefined>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    configService = {
      get: jest.fn().mockReturnValue('correct-key'),
    } as unknown as jest.Mocked<ConfigService>;
    guard = new ApiKeyGuard(reflector, configService);
  });

  it('allows the request when the route is marked @SkipAuth', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when the header is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the header does not match the configured key', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = buildContext({ 'x-api-key': 'wrong-key' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows the request when the header matches the configured key', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = buildContext({ 'x-api-key': 'correct-key' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
