import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryTrackEntity } from './library-track.entity';
import { StorageService } from './storage.service';
import { AudioAnalysisJobEntity } from './audio-analysis-job.entity';
import { AudioAnalysisQueueService } from './audio-analysis-queue.service';
import { AudioAnalysisWorker } from './audio-analysis.worker';
import { AudioAnalyzerService } from './audio-analyzer.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([LibraryTrackEntity, AudioAnalysisJobEntity]),
  ],
  controllers: [LibraryController],
  providers: [
    LibraryService,
    StorageService,
    AudioAnalyzerService,
    AudioAnalysisQueueService,
    AudioAnalysisWorker,
  ],
  exports: [LibraryService],
})
export class LibraryModule {}
