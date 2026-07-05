import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(helmet());
  app.enableCors({ origin: configService.get('CORS_ORIGIN') ?? '*' });

  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('JobFlow CV Pipeline')
      .setVersion('0.1.0')
      .setDescription(
        'Backend API for AI-assisted vacancy analysis, evidence-based targeted CV generation and CV PDF export.',
      )
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  app.get(Logger).log(`JobFlow CV Pipeline running on port ${port}`);
}

bootstrap();
