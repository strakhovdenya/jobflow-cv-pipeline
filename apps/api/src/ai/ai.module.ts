import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProvider } from './ai-provider.interface';
import { FakeAiProvider } from './providers/fake.provider';
import { OpenAiProvider } from './providers/openai.provider';

const logger = new Logger('AiModule');

export function createAiProvider(configService: ConfigService): AiProvider {
  const providerName = configService.get<string>('AI_PROVIDER') ?? 'fake';
  const provider =
    providerName === 'openai'
      ? new OpenAiProvider(configService)
      : new FakeAiProvider();
  logger.log(
    `AI provider: ${provider.providerName} (model: ${provider.modelName})`,
  );
  return provider;
}

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: createAiProvider,
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
