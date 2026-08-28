import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { AI_PROVIDER } from './ai-provider.interface';
import { GroqProvider } from './groq.provider';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [AiController],
  providers: [
    GroqProvider,
    { provide: AI_PROVIDER, useExisting: GroqProvider },
    AiChatService,
  ],
  exports: [AiChatService, AI_PROVIDER],
})
export class AiModule {}
