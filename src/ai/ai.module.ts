import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProvider } from './ai-provider.interface';
import { FakeAiProvider } from './providers/fake.provider';
import { OpenAiProvider } from './providers/openai.provider';

export function createAiProvider(configService: ConfigService): AiProvider {
  const providerName = configService.get<string>('AI_PROVIDER') ?? 'fake';
  return providerName === 'openai'
    ? new OpenAiProvider(configService)
    : new FakeAiProvider();
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
