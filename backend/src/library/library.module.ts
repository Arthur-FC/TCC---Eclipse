import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryTrackEntity } from './library-track.entity';
import { StorageService } from './storage.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([LibraryTrackEntity])],
  controllers: [LibraryController],
  providers: [LibraryService, StorageService],
  exports: [LibraryService],
})
export class LibraryModule {}
