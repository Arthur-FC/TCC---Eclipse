import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, extname, join } from 'path';
import { DataSource, Repository } from 'typeorm';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { StorageService } from '../library/storage.service';
import { ReferenceStemEntity } from './reference-stem.entity';
import { StemSeparationJobEntity } from './stem-separation-job.entity';
import { StemSeparationEntity } from './stem-separation.entity';
import { StemSeparationStatus, StemType } from './stem-separation-status.enum';

interface ClaimedJob { id: string; separation_id: string }

@Injectable()
export class StemSeparationWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(StemSeparationWorker.name);
  private readonly enabled: boolean;
  private readonly pollMs: number;
  private readonly command: string;
  private readonly timeoutMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly db: DataSource,
    @InjectRepository(StemSeparationEntity) private readonly separations: Repository<StemSeparationEntity>,
    @InjectRepository(StemSeparationJobEntity) private readonly jobs: Repository<StemSeparationJobEntity>,
    @InjectRepository(ReferenceStemEntity) private readonly stems: Repository<ReferenceStemEntity>,
    @InjectRepository(LibraryTrackEntity) private readonly tracks: Repository<LibraryTrackEntity>,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('STEM_SEPARATOR_WORKER_ENABLED', false);
    this.pollMs = config.get<number>('STEM_SEPARATOR_POLL_INTERVAL_MS', 2_000);
    this.command = this.resolveCommand(config.get<string>('STEM_SEPARATOR_COMMAND', ''));
    this.timeoutMs = config.get<number>('STEM_SEPARATOR_TIMEOUT_MS', 1_800_000);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) return;
    await this.db.query(`UPDATE stem_separation_jobs SET status='queued', locked_at=NULL, available_at=now() WHERE status='processing'`);
    this.timer = setInterval(() => void this.runOnce(), this.pollMs);
    this.timer.unref();
    void this.runOnce();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<boolean> {
    if (!this.enabled || this.running) return false;
    this.running = true;
    try {
      const job = await this.claim();
      if (!job) return false;
      await this.process(job);
      return true;
    } catch (error) {
      this.logger.error(this.message(error));
      return false;
    } finally {
      this.running = false;
    }
  }

  private async claim(): Promise<ClaimedJob | null> {
    const result = await this.db.query<ClaimedJob[]>(`
      WITH next_job AS (
        SELECT id FROM stem_separation_jobs
        WHERE status='queued' AND available_at <= now()
        ORDER BY available_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE stem_separation_jobs job SET status='processing', attempts=job.attempts+1,
        locked_at=now(), error_message=NULL, updated_at=now()
      FROM next_job WHERE job.id=next_job.id
      RETURNING job.id, job.separation_id
    `);
    const rows = Array.isArray(result[0]) ? result[0] as unknown as ClaimedJob[] : result;
    return rows[0] ?? null;
  }

  private async process(job: ClaimedJob): Promise<void> {
    const separation = await this.separations.findOneBy({ id: job.separation_id });
    const track = separation ? await this.tracks.findOneBy({ id: separation.inputTrackId }) : null;
    if (!separation || !track) {
      await this.finish(job, separation, 'Separação ou áudio de origem não encontrado.');
      return;
    }
    const directory = await mkdtemp(join(tmpdir(), 'eclipse-stems-'));
    try {
      separation.status = StemSeparationStatus.PROCESSING;
      separation.progress = 10;
      separation.errorMessage = null;
      await this.separations.save(separation);
      const extension = extname(track.originalFilename).toLowerCase() === '.wav' ? '.wav' : '.mp3';
      const input = join(directory, `source${extension}`);
      await writeFile(input, await this.storage.getObjectBytes(track.objectKey));
      separation.progress = 30;
      await this.separations.save(separation);

      await this.runDemucs(separation.modelName, directory, input);
      const output = join(directory, separation.modelName, basename(input, extension));
      const outputFiles: Array<{ type: StemType; filename: string }> = [
        { type: StemType.VOCALS, filename: 'vocals.wav' },
        { type: StemType.INSTRUMENTAL, filename: 'no_vocals.wav' },
        { type: StemType.DRUMS, filename: 'drums.wav' },
        { type: StemType.BASS, filename: 'bass.wav' },
        { type: StemType.GUITAR, filename: 'guitar.wav' },
        { type: StemType.PIANO, filename: 'piano.wav' },
        { type: StemType.OTHER, filename: 'other.wav' },
      ];
      await Promise.all(outputFiles.map((value) => access(join(output, value.filename))));
      const values = await Promise.all(outputFiles.map(async (value) => ({
        type: value.type,
        bytes: await readFile(join(output, value.filename)),
      })));
      separation.progress = 90;
      await this.separations.save(separation);

      await this.stems.delete({ separationId: separation.id });
      for (const value of values) {
        const objectKey = `${track.ownerId}/reference-separations/${separation.id}/${value.type}.wav`;
        await this.storage.putObjectBytes(objectKey, value.bytes, 'audio/wav');
        await this.stems.save(this.stems.create({ separationId: separation.id, type: value.type, objectKey, contentType: 'audio/wav', sizeBytes: value.bytes.byteLength }));
      }
      separation.status = StemSeparationStatus.COMPLETED;
      separation.progress = 100;
      separation.completedAt = new Date();
      await this.separations.save(separation);
      await this.jobs.update(job.id, { status: 'completed', lockedAt: null, errorMessage: null });
    } catch (error) {
      await this.finish(job, separation, this.message(error));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private runDemucs(model: string, output: string, input: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, [this.runnerPath(), '--eclipse-mix-instrumental', '-n', model, '-o', output, input], { shell: false, windowsHide: true });
      let errors = '';
      child.stderr.on('data', (chunk: Buffer) => { errors = `${errors}${chunk.toString()}`.slice(-2_000); });
      const timer = setTimeout(() => { child.kill(); reject(new Error('A separação excedeu o tempo limite.')); }, this.timeoutMs);
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.once('close', (code) => {
        clearTimeout(timer);
        code === 0 ? resolve() : reject(new Error(errors || `Demucs finalizou com código ${code}.`));
      });
    });
  }

  private async finish(job: ClaimedJob, separation: StemSeparationEntity | null, message: string): Promise<void> {
    const safe = message.replace(/[\r\n]+/g, ' ').slice(0, 500);
    if (separation) {
      separation.status = StemSeparationStatus.FAILED;
      separation.progress = 100;
      separation.errorMessage = safe;
      await this.separations.save(separation);
    }
    await this.jobs.update(job.id, { status: 'failed', lockedAt: null, errorMessage: safe });
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Falha desconhecida ao separar as faixas.';
  }

  private resolveCommand(configured: string): string {
    if (configured.trim()) return configured.trim();
    const executable = process.platform === 'win32' ? 'python.exe' : 'python';
    const candidates = [
      join(process.cwd(), '.venv-stems', process.platform === 'win32' ? 'Scripts' : 'bin', executable),
      join(process.cwd(), 'backend', '.venv-stems', process.platform === 'win32' ? 'Scripts' : 'bin', executable),
    ];
    return candidates.find((candidate) => existsSync(candidate)) ?? (process.platform === 'win32' ? 'python' : 'python3');
  }

  private runnerPath(): string {
    const candidates = [
      join(process.cwd(), 'scripts', 'demucs_local_runner.py'),
      join(process.cwd(), 'backend', 'scripts', 'demucs_local_runner.py'),
    ];
    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
  }
}
