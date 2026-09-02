import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SessionEntity } from '../auth/session.entity';
import { UserEntity } from '../users/user.entity';
import { ConversationEntity } from '../projects/conversation.entity';
import { MessageEntity } from '../projects/message.entity';
import { ProjectEntity } from '../projects/project.entity';
import { InitialAuthSchema1756152000000 } from './migrations/1756152000000-initial-auth-schema';
import { ProjectsAndConversations1756155600000 } from './migrations/1756155600000-projects-and-conversations';
import { AiMessageMetadata1787702400000 } from './migrations/1787702400000-ai-message-metadata';
import { BriefingEntity } from '../briefings/briefing.entity';
import { StructuredBriefings1787788800000 } from './migrations/1787788800000-structured-briefings';
import { AiToolExecutionEntity } from '../ai-tools/ai-tool-execution.entity';
import { AiToolExecutions1787961600000 } from './migrations/1787961600000-ai-tool-executions';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { YouTubeSearchCacheEntity } from '../references/youtube-search-cache.entity';
import { YouTubeQuotaUsageEntity } from '../references/youtube-quota-usage.entity';
import { YoutubeReferences1788048000000 } from './migrations/1788048000000-youtube-references';
import { SpotifyReferences1788134400000 } from './migrations/1788134400000-spotify-references';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { MusicLibrary1788220800000 } from './migrations/1788220800000-music-library';
import { LibraryContentHash1788307200000 } from './migrations/1788307200000-library-content-hash';
import { AudioAnalysisJobEntity } from '../library/audio-analysis-job.entity';
import { AudioAnalysis1788393600000 } from './migrations/1788393600000-audio-analysis';
import { SemanticLibrarySearch1788480000000 } from './migrations/1788480000000-semantic-library-search';

export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(configService),
    autoLoadEntities: true,
  };
}

export function createDataSourceOptions(
  configService: ConfigService,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('DATABASE_HOST'),
    port: configService.getOrThrow<number>('DATABASE_PORT'),
    database: configService.getOrThrow<string>('DATABASE_NAME'),
    username: configService.getOrThrow<string>('DATABASE_USER'),
    password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
    entities: [
      UserEntity,
      SessionEntity,
      ProjectEntity,
      ConversationEntity,
      MessageEntity,
      BriefingEntity,
      AiToolExecutionEntity,
      MusicReferenceEntity,
      YouTubeSearchCacheEntity,
      YouTubeQuotaUsageEntity,
      LibraryTrackEntity,
      AudioAnalysisJobEntity,
    ],
    migrations: [
      InitialAuthSchema1756152000000,
      ProjectsAndConversations1756155600000,
      AiMessageMetadata1787702400000,
      StructuredBriefings1787788800000,
      AiToolExecutions1787961600000,
      YoutubeReferences1788048000000,
      SpotifyReferences1788134400000,
      MusicLibrary1788220800000,
      LibraryContentHash1788307200000,
      AudioAnalysis1788393600000,
      SemanticLibrarySearch1788480000000,
    ],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    applicationName: 'eclipse-api',
    ssl:
      configService.get<string>('NODE_ENV') === 'production'
        ? { rejectUnauthorized: true }
        : false,
  };
}
