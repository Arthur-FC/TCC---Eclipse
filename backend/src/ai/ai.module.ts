import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { AiProviderModule } from './ai-provider.module';
import { AiToolsModule } from '../ai-tools/ai-tools.module';
import { BriefingsModule } from '../briefings/briefings.module';
import { LibraryModule } from '../library/library.module';
import { MoodboardsModule } from '../moodboards/moodboards.module';
import { ReferencesModule } from '../references/references.module';
import { ProjectMemoryService } from './project-memory.service';

@Module({
  imports: [AuthModule, ProjectsModule, AiProviderModule, AiToolsModule, BriefingsModule, MoodboardsModule, ReferencesModule, LibraryModule],
  controllers: [AiController],
  providers: [AiChatService, ProjectMemoryService],
  exports: [AiChatService],
})
export class AiModule {}
