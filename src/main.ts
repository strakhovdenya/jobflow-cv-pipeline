import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(helmet());
  app.enableCors({ origin: configService.get('CORS_ORIGIN') ?? '*' });
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`JobFlow CV Pipeline running on port ${port}`);
}

bootstrap();
