import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LibraryModule } from '../library/library.module';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { UserEntity } from '../users/user.entity';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { SessionEntity } from '../auth/session.entity';
import { DataRetentionWorker } from './data-retention.worker';

@Module({
  imports: [AuthModule, LibraryModule, TypeOrmModule.forFeature([UserEntity, LibraryTrackEntity, SessionEntity])],
  controllers: [PrivacyController],
  providers: [PrivacyService, DataRetentionWorker],
})
export class PrivacyModule {}
