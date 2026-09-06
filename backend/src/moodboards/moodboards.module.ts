import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AiProviderModule } from '../ai/ai-provider.module';
import { BriefingsModule } from '../briefings/briefings.module';
import { ProjectsModule } from '../projects/projects.module';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { ReferenceSelectionEntity } from '../references/reference-selection.entity';
import { MoodboardEntity } from './moodboard.entity';
import { MoodboardsController } from './moodboards.controller';
import { MoodboardsService } from './moodboards.service';

@Module({ imports: [AuthModule, AiProviderModule, BriefingsModule, ProjectsModule, TypeOrmModule.forFeature([MoodboardEntity, MusicReferenceEntity, ReferenceSelectionEntity])], controllers: [MoodboardsController], providers: [MoodboardsService], exports: [MoodboardsService] })
export class MoodboardsModule {}
