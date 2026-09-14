import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LibraryModule } from '../library/library.module';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { ProjectsModule } from '../projects/projects.module';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { ReferenceStemEntity } from './reference-stem.entity';
import { StemSeparationController } from './stem-separation.controller';
import { StemSeparationJobEntity } from './stem-separation-job.entity';
import { StemSeparationEntity } from './stem-separation.entity';
import { StemSeparationService } from './stem-separation.service';
import { StemSeparationWorker } from './stem-separation.worker';

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    LibraryModule,
    TypeOrmModule.forFeature([MusicReferenceEntity, LibraryTrackEntity, StemSeparationEntity, ReferenceStemEntity, StemSeparationJobEntity]),
  ],
  controllers: [StemSeparationController],
  providers: [StemSeparationService, StemSeparationWorker],
})
export class StemSeparationModule {}
