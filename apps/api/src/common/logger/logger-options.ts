import { ConfigService } from '@nestjs/config';

export function createPinoHttpOptions(cfg: ConfigService) {
  return {
    level: cfg.get<string>('LOG_LEVEL') ?? 'info',
    redact: [
      'req.headers["x-api-key"]',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    ...(!['production', 'test'].includes(cfg.get<string>('NODE_ENV') ?? '') && {
      transport: { target: 'pino-pretty', options: { singleLine: true } },
    }),
  };
}
