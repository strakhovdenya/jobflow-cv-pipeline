import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { DocumentExportModule } from './document-export/document-export.module';
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
          ...(cfg.get('NODE_ENV') !== 'production' && {
            transport: { target: 'pino-pretty', options: { singleLine: true } },
          }),
        },
      }),
    }),
    PrismaModule,
    WorkspacesModule,
    DocumentExportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
