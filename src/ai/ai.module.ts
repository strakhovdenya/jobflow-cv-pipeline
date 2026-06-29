import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import { FakeAiProvider } from './providers/fake.provider';

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useClass: FakeAiProvider,
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
