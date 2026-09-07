import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BriefingEntity } from '../briefings/briefing.entity';
import { LibraryModule } from '../library/library.module';
import { MoodboardEntity } from '../moodboards/moodboard.entity';
import { ProjectEntity } from '../projects/project.entity';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { ReferenceSelectionEntity } from '../references/reference-selection.entity';
import { FinalWorksController } from './final-works.controller';
import { FinalWorksService } from './final-works.service';

@Module({
  imports: [
    AuthModule,
    LibraryModule,
    TypeOrmModule.forFeature([ProjectEntity, BriefingEntity, MoodboardEntity, MusicReferenceEntity, ReferenceSelectionEntity]),
  ],
  controllers: [FinalWorksController],
  providers: [FinalWorksService],
})
export class FinalWorksModule {}
