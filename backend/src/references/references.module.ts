import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BriefingsModule } from '../briefings/briefings.module';
import { ProjectsModule } from '../projects/projects.module';
import { MusicReferenceEntity } from './music-reference.entity';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';
import { YouTubeClient } from './youtube.client';
import { YouTubeQuotaUsageEntity } from './youtube-quota-usage.entity';
import { YouTubeSearchCacheEntity } from './youtube-search-cache.entity';
import { SpotifyClient } from './spotify.client';
import { LibraryModule } from '../library/library.module';
import { AiProviderModule } from '../ai/ai-provider.module';
import { ReferenceSelectionEntity } from './reference-selection.entity';
import { CurationService } from './curation.service';
import { CurationController } from './curation.controller';

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    BriefingsModule,
    LibraryModule,
    AiProviderModule,
    TypeOrmModule.forFeature([
      MusicReferenceEntity,
      ReferenceSelectionEntity,
      YouTubeSearchCacheEntity,
      YouTubeQuotaUsageEntity,
    ]),
  ],
  controllers: [ReferencesController, CurationController],
  providers: [ReferencesService, YouTubeClient, SpotifyClient, CurationService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
