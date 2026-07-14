import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { envValidationSchema } from './config/env.validation';
import { DocumentExportModule } from './document-export/document-export.module';
import { ImportModule } from './import/import.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        pinoHttp: {
          level: cfg.get<string>('LOG_LEVEL') ?? 'info',
          ...(!['production', 'test'].includes(cfg.get('NODE_ENV') ?? '') && {
            transport: { target: 'pino-pretty', options: { singleLine: true } },
          }),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          {
            ttl: cfg.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: cfg.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    PrismaModule,
    WorkspacesModule,
    DocumentExportModule,
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
