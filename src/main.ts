import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`JobFlow CV Pipeline running on port ${port}`);
}

bootstrap();
