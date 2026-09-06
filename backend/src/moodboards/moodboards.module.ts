import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AiProviderModule } from '../ai/ai-provider.module';
import { BriefingsModule } from '../briefings/briefings.module';
import { ProjectsModule } from '../projects/projects.module';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { ReferenceSelectionEntity } from '../references/reference-selection.entity';
import { MoodboardEntity } from './moodboard.entity';
import { BriefingEntity } from '../briefings/briefing.entity';
import { MoodboardsController } from './moodboards.controller';
import { MoodboardsService } from './moodboards.service';
import { MoodboardPdfService } from './moodboard-pdf.service';

@Module({ imports: [AuthModule, AiProviderModule, BriefingsModule, ProjectsModule, TypeOrmModule.forFeature([MoodboardEntity, MusicReferenceEntity, ReferenceSelectionEntity, BriefingEntity])], controllers: [MoodboardsController], providers: [MoodboardsService, MoodboardPdfService], exports: [MoodboardsService] })
export class MoodboardsModule {}
