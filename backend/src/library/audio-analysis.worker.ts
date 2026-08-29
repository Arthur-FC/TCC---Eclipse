import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AudioAnalysisJobEntity } from './audio-analysis-job.entity';
import {
  AUDIO_ANALYZER_METHOD,
  AUDIO_ANALYZER_VERSION,
  AudioAnalyzerService,
} from './audio-analyzer.service';
import { AudioAnalysisStatus } from './audio-analysis-status.enum';
import { LibraryTrackEntity } from './library-track.entity';
import { LibraryTrackStatus } from './library-track-status.enum';
import { StorageService } from './storage.service';

interface ClaimedJob {
  id: string;
  track_id: string;
}

@Injectable()
export class AudioAnalysisWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AudioAnalysisWorker.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(LibraryTrackEntity)
    private readonly tracks: Repository<LibraryTrackEntity>,
    @InjectRepository(AudioAnalysisJobEntity)
    private readonly jobs: Repository<AudioAnalysisJobEntity>,
    private readonly storage: StorageService,
    private readonly analyzer: AudioAnalyzerService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('AUDIO_ANALYSIS_WORKER_ENABLED', true);
    this.intervalMs = config.get<number>('AUDIO_ANALYSIS_POLL_INTERVAL_MS', 1_000);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) return;
    await this.recoverInterruptedJobs();
    this.timer = setInterval(() => void this.runOnce(), this.intervalMs);
    this.timer.unref();
    void this.runOnce();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(): Promise<boolean> {
    if (!this.enabled || this.running) return false;
    this.running = true;
    try {
      const job = await this.claimNext();
      if (!job) return false;
      await this.process(job);
      return true;
    } catch (error) {
      this.logger.error(
        `Falha inesperada no ciclo do worker: ${this.safeMessage(error)}`,
      );
      return false;
    } finally {
      this.running = false;
    }
  }

  private async claimNext(): Promise<ClaimedJob | null> {
    const result = await this.dataSource.query<
      ClaimedJob[] | { records?: ClaimedJob[]; raw?: ClaimedJob[] }
    >(`
      WITH next_job AS (
        SELECT "id"
        FROM "audio_analysis_jobs"
        WHERE "status" = 'queued' AND "available_at" <= now()
        ORDER BY "available_at", "created_at"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "audio_analysis_jobs" AS job
      SET "status" = 'processing',
          "attempts" = job."attempts" + 1,
          "locked_at" = now(),
          "error_message" = NULL,
          "updated_at" = now()
      FROM next_job
      WHERE job."id" = next_job."id"
      RETURNING job."id", job."track_id"
    `);
    const rows = Array.isArray(result)
      ? Array.isArray(result[0])
        ? (result[0] as ClaimedJob[])
        : (result as ClaimedJob[])
      : result.records ?? result.raw ?? [];
    return rows[0] ?? null;
  }

  private async process(job: ClaimedJob): Promise<void> {
    const track = await this.tracks.findOneBy({ id: job.track_id });
    if (!track || track.status !== LibraryTrackStatus.READY) {
      await this.finishJob(job.id, 'failed', 'A faixa não está disponível para análise.');
      return;
    }

    try {
      await this.updateProgress(track, 10);
      const bytes = await this.storage.getObjectBytes(track.objectKey);
      await this.updateProgress(track, 30);
      const result = await this.analyzer.analyze(bytes, track.contentType);
      Object.assign(track, {
        analysisStatus: AudioAnalysisStatus.COMPLETED,
        analysisProgress: 100,
        analysisError: null,
        analyzedAt: new Date(),
        analysisVersion: result.version,
        analysisMethod: result.method,
        detectedFormat: result.detectedFormat,
        codec: result.codec,
        durationSeconds: result.durationSeconds,
        sampleRateHz: result.sampleRateHz,
        channels: result.channels,
        bitrateBps: result.bitrateBps,
        estimatedBpm: result.estimatedBpm,
        bpmConfidence: result.bpmConfidence,
        estimatedKey: result.estimatedKey,
        keyConfidence: result.keyConfidence,
        genreTags: result.genreTags,
        moodTags: result.moodTags,
        instrumentTags: result.instrumentTags,
      });
      await this.tracks.save(track);
      await this.finishJob(job.id, 'completed', null);
      this.logger.log(`Análise concluída trackId=${track.id}`);
    } catch (error) {
      const message = this.safeMessage(error);
      Object.assign(track, {
        analysisStatus: AudioAnalysisStatus.FAILED,
        analysisProgress: 100,
        analysisError: message,
        analysisVersion: AUDIO_ANALYZER_VERSION,
        analysisMethod: AUDIO_ANALYZER_METHOD,
      });
      await this.tracks.save(track);
      await this.finishJob(job.id, 'failed', message);
      this.logger.warn(`Análise falhou trackId=${track.id}: ${message}`);
    }
  }

  private async updateProgress(
    track: LibraryTrackEntity,
    progress: number,
  ): Promise<void> {
    track.analysisStatus = AudioAnalysisStatus.PROCESSING;
    track.analysisProgress = progress;
    track.analysisError = null;
    await this.tracks.save(track);
  }

  private async finishJob(
    id: string,
    status: 'completed' | 'failed',
    errorMessage: string | null,
  ): Promise<void> {
    await this.jobs.update(id, {
      status,
      errorMessage,
      lockedAt: null,
    });
  }

  private async recoverInterruptedJobs(): Promise<void> {
    await this.dataSource.query(`
      UPDATE "audio_analysis_jobs"
      SET "status" = 'queued', "locked_at" = NULL, "available_at" = now()
      WHERE "status" = 'processing'
    `);
  }

  private safeMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Falha desconhecida na análise.';
    return message.replace(/[\r\n]+/g, ' ').slice(0, 500);
  }
}
