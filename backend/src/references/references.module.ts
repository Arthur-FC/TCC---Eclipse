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

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    BriefingsModule,
    TypeOrmModule.forFeature([
      MusicReferenceEntity,
      YouTubeSearchCacheEntity,
      YouTubeQuotaUsageEntity,
    ]),
  ],
  controllers: [ReferencesController],
  providers: [ReferencesService, YouTubeClient, SpotifyClient],
  exports: [ReferencesService],
})
export class ReferencesModule {}
