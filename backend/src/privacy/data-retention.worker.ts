import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SessionEntity } from '../auth/session.entity';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { LibraryTrackStatus } from '../library/library-track-status.enum';
import { StorageService } from '../library/storage.service';

@Injectable()
export class DataRetentionWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DataRetentionWorker.name);
  private readonly failedDays: number;
  private readonly sessionDays: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(LibraryTrackEntity) private readonly tracks: Repository<LibraryTrackEntity>,
    @InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.failedDays = config.get<number>('FAILED_UPLOAD_RETENTION_DAYS', 7);
    this.sessionDays = config.get<number>('SESSION_RECORD_RETENTION_DAYS', 30);
  }

  onApplicationBootstrap(): void {
    const initial = setTimeout(() => this.executeSafely(), 10_000);
    initial.unref();
    this.timer = setInterval(() => this.executeSafely(), 86_400_000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<void> {
    const now = new Date();
    const failedBefore = new Date(now.getTime() - this.failedDays * 86_400_000);
    const stale = [
      ...await this.tracks.findBy({ status: LibraryTrackStatus.PENDING, uploadExpiresAt: LessThan(now) }),
      ...await this.tracks.findBy({ status: LibraryTrackStatus.FAILED, createdAt: LessThan(failedBefore) }),
    ];
    for (const track of new Map(stale.map((item) => [item.id, item])).values()) {
      try {
        await this.storage.deleteObject(track.objectKey);
        await this.tracks.remove(track);
      } catch {
        this.logger.warn(`Retenção adiada para trackId=${track.id}`);
      }
    }
    const sessionBefore = new Date(now.getTime() - this.sessionDays * 86_400_000);
    await this.sessions.createQueryBuilder().delete()
      .where('expires_at < :now', { now })
      .orWhere('revoked_at IS NOT NULL AND revoked_at < :sessionBefore', { sessionBefore })
      .execute();
  }

  private executeSafely(): void {
    void this.runOnce().catch(() => {
      this.logger.error('Falha ao executar a política automática de retenção.');
    });
  }
}
