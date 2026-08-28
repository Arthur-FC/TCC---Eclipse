import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { AiProviderModule } from './ai-provider.module';
import { AiToolsModule } from '../ai-tools/ai-tools.module';

@Module({
  imports: [AuthModule, ProjectsModule, AiProviderModule, AiToolsModule],
  controllers: [AiController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiModule {}
