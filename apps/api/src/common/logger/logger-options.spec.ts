import { ConfigService } from '@nestjs/config';
import { Writable } from 'node:stream';
import pino from 'pino';
import { createPinoHttpOptions } from './logger-options';

describe('createPinoHttpOptions', () => {
  it('redacts API key and auth headers from request logs', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });
    const options = createPinoHttpOptions(
      new ConfigService({ NODE_ENV: 'test' }),
    );
    const logger = pino(options, stream);

    logger.info({
      req: {
        headers: {
          'x-api-key': 'SECRET123',
          authorization: 'Bearer AUTH_SECRET',
          cookie: 'session=COOKIE_SECRET',
        },
      },
    });

    const output = chunks.join('');

    expect(output).not.toContain('SECRET123');
    expect(output).not.toContain('AUTH_SECRET');
    expect(output).not.toContain('COOKIE_SECRET');
    expect(output).toContain('[Redacted]');
  });

  it.each([
    ['production', false],
    ['test', false],
    ['development', true],
  ])('preserves level and transport for NODE_ENV=%s', (nodeEnv, hasTransport) => {
    const options = createPinoHttpOptions(
      new ConfigService({ NODE_ENV: nodeEnv, LOG_LEVEL: 'warn' }),
    );

    expect(options.level).toBe('warn');
    if (hasTransport) {
      expect(options.transport).toEqual({
        target: 'pino-pretty',
        options: { singleLine: true },
      });
    } else {
      expect(options.transport).toBeUndefined();
    }
  });
});
