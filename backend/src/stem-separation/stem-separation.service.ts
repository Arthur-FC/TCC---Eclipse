import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { LibraryTrackStatus } from '../library/library-track-status.enum';
import { StorageService } from '../library/storage.service';
import { ProjectsService } from '../projects/projects.service';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { ReferenceStatus } from '../references/reference-status.enum';
import { ReferenceStemEntity } from './reference-stem.entity';
import { StemSeparationJobEntity } from './stem-separation-job.entity';
import { StemSeparationEntity } from './stem-separation.entity';
import { StemSeparationStatus, StemType } from './stem-separation-status.enum';

export interface StemSeparationResponse {
  id: string;
  referenceId: string;
  inputTrackId: string;
  status: StemSeparationStatus;
  progress: number;
  modelName: string;
  modelVersion: string;
  errorMessage: string | null;
  completedAt: Date | null;
  stems: Array<{ id: string; type: StemType; sizeBytes: number }>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StemSeparationService {
  private readonly modelName: string;
  private readonly modelVersion: string;

  constructor(
    @InjectRepository(MusicReferenceEntity) private readonly references: Repository<MusicReferenceEntity>,
    @InjectRepository(LibraryTrackEntity) private readonly tracks: Repository<LibraryTrackEntity>,
    @InjectRepository(StemSeparationEntity) private readonly separations: Repository<StemSeparationEntity>,
    @InjectRepository(ReferenceStemEntity) private readonly stems: Repository<ReferenceStemEntity>,
    @InjectRepository(StemSeparationJobEntity) private readonly jobs: Repository<StemSeparationJobEntity>,
    private readonly projects: ProjectsService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.modelName = config.get<string>('STEM_SEPARATOR_MODEL', 'htdemucs');
    this.modelVersion = config.get<string>('STEM_SEPARATOR_VERSION', 'demucs-v4');
  }

  async list(ownerId: string, projectId: string): Promise<StemSeparationResponse[]> {
    await this.projects.getActiveProject(ownerId, projectId);
    const refs = await this.references.findBy({ projectId });
    if (!refs.length) return [];
    const rows = await this.separations.find({
      where: { referenceId: In(refs.map((item) => item.id)) },
      order: { createdAt: 'ASC' },
    });
    return this.withStems(rows);
  }

  async start(ownerId: string, projectId: string, referenceId: string, libraryTrackId?: string): Promise<StemSeparationResponse> {
    await this.projects.getActiveProject(ownerId, projectId);
    const reference = await this.references.findOneBy({ id: referenceId, projectId });
    if (!reference) throw new NotFoundException('Referência não encontrada.');
    if (reference.status !== ReferenceStatus.APPROVED) {
      throw new ConflictException('Aprove a referência antes de separar as faixas.');
    }
    let separation = await this.separations.findOneBy({ referenceId });
    const trackId = reference.libraryTrackId ?? libraryTrackId ?? separation?.inputTrackId;
    if (!trackId) throw new BadRequestException('Selecione ou envie um áudio autorizado.');
    const track = await this.tracks.findOneBy({ id: trackId, ownerId });
    if (!track || track.status !== LibraryTrackStatus.READY) {
      throw new BadRequestException('O áudio selecionado não está pronto.');
    }

    if (separation?.status === StemSeparationStatus.PROCESSING) {
      throw new ConflictException('Esta referência já está sendo processada.');
    }
    if (separation?.status === StemSeparationStatus.COMPLETED && separation.inputTrackId === trackId) {
      return (await this.withStems([separation]))[0];
    }
    if (!separation) {
      separation = this.separations.create({
        referenceId,
        inputTrackId: trackId,
        status: StemSeparationStatus.QUEUED,
        progress: 0,
        modelName: this.modelName,
        modelVersion: this.modelVersion,
        errorMessage: null,
        completedAt: null,
      });
    } else {
      await this.removeStemObjects(separation.id);
      Object.assign(separation, {
        inputTrackId: trackId,
        status: StemSeparationStatus.QUEUED,
        progress: 0,
        modelName: this.modelName,
        modelVersion: this.modelVersion,
        errorMessage: null,
        completedAt: null,
      });
    }
    const saved = await this.separations.save(separation);
    await this.enqueue(saved.id);
    return (await this.withStems([saved]))[0];
  }

  async stemUrl(ownerId: string, projectId: string, referenceId: string, stemId: string, download: boolean) {
    await this.projects.getActiveProject(ownerId, projectId);
    const reference = await this.references.findOneBy({ id: referenceId, projectId });
    if (!reference) throw new NotFoundException('Referência não encontrada.');
    if (reference.status !== ReferenceStatus.APPROVED) {
      throw new ConflictException('A referência precisa continuar aprovada para acessar as faixas.');
    }
    const separation = await this.separations.findOneBy({ referenceId });
    const stem = separation ? await this.stems.findOneBy({ id: stemId, separationId: separation.id }) : null;
    if (!stem || separation?.status !== StemSeparationStatus.COMPLETED) {
      throw new NotFoundException('Faixa separada não encontrada.');
    }
    const filename = `${stem.type === StemType.VOCALS ? 'voz' : 'instrumental'}.wav`;
    return download
      ? this.storage.createDownloadUrl(stem.objectKey, filename, stem.contentType)
      : this.storage.createPlaybackUrl(stem.objectKey, filename, stem.contentType);
  }

  private async enqueue(separationId: string): Promise<void> {
    let job = await this.jobs.findOneBy({ separationId });
    if (!job) job = this.jobs.create({ separationId, status: 'queued', attempts: 0, availableAt: new Date(), lockedAt: null, errorMessage: null });
    else Object.assign(job, { status: 'queued', availableAt: new Date(), lockedAt: null, errorMessage: null });
    await this.jobs.save(job);
  }

  private async withStems(rows: StemSeparationEntity[]): Promise<StemSeparationResponse[]> {
    const stemRows = rows.length ? await this.stems.findBy({ separationId: In(rows.map((row) => row.id)) }) : [];
    return rows.map((row) => ({
      id: row.id, referenceId: row.referenceId, inputTrackId: row.inputTrackId,
      status: row.status, progress: row.progress, modelName: row.modelName,
      modelVersion: row.modelVersion, errorMessage: row.errorMessage,
      completedAt: row.completedAt,
      stems: stemRows.filter((stem) => stem.separationId === row.id).map((stem) => ({ id: stem.id, type: stem.type, sizeBytes: stem.sizeBytes })),
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    }));
  }

  private async removeStemObjects(separationId: string): Promise<void> {
    const old = await this.stems.findBy({ separationId });
    for (const stem of old) {
      try { await this.storage.deleteObject(stem.objectKey); } catch { /* a nova execução pode continuar */ }
    }
    if (old.length) await this.stems.remove(old);
  }
}
