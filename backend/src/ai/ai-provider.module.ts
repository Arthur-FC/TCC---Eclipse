import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import { GroqProvider } from './groq.provider';

@Module({
  providers: [
    GroqProvider,
    { provide: AI_PROVIDER, useExisting: GroqProvider },
  ],
  exports: [AI_PROVIDER],
})
export class AiProviderModule {}
