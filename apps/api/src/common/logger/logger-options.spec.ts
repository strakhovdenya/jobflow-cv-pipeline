import { ConfigService } from '@nestjs/config';
import { createServer } from 'node:http';
import { Writable } from 'node:stream';
import pinoHttp from 'pino-http';
import { createPinoHttpOptions } from './logger-options';

describe('createPinoHttpOptions', () => {
  it('redacts API key and auth headers from pino-http request logs', async () => {
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
    const logger = pinoHttp(options, stream);
    const server = createServer((req, res) => {
      logger(req, res);
      res.end('ok');
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address === null || typeof address === 'string') {
          reject(new Error('Expected HTTP server to listen on a TCP port'));
          return;
        }

        fetch(`http://127.0.0.1:${address.port}/`, {
          headers: {
            'x-api-key': 'SECRET123',
            authorization: 'Bearer AUTH_SECRET',
            cookie: 'session=COOKIE_SECRET',
          },
        })
          .then((response) => response.text())
          .then(() => resolve())
          .catch(reject);
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
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
  ])(
    'preserves level and transport for NODE_ENV=%s',
    (nodeEnv, hasTransport) => {
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
    },
  );
});
