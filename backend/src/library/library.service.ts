import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { LessThan, Repository } from 'typeorm';
import { CreateTrackUploadDto } from './dto/create-track-upload.dto';
import { LibraryTrackEntity } from './library-track.entity';
import { LibraryTrackStatus } from './library-track-status.enum';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { AudioAnalysisStatus } from './audio-analysis-status.enum';
import { AudioAnalysisQueueService } from './audio-analysis-queue.service';

export interface LibraryTrackResponse {
  id: string;
  title: string;
  artist: string | null;
  notes: string | null;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  status: LibraryTrackStatus;
  errorMessage: string | null;
  uploadedAt: Date | null;
  analysisStatus: AudioAnalysisStatus;
  analysisProgress: number;
  analysisError: string | null;
  analyzedAt: Date | null;
  analysisVersion: string | null;
  analysisMethod: string | null;
  detectedFormat: string | null;
  codec: string | null;
  durationSeconds: number | null;
  sampleRateHz: number | null;
  channels: number | null;
  bitrateBps: number | null;
  estimatedBpm: number | null;
  bpmConfidence: number | null;
  estimatedKey: string | null;
  keyConfidence: number | null;
  genreTags: string[];
  moodTags: string[];
  instrumentTags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackUploadResponse {
  track: LibraryTrackResponse;
  uploadUrl: string;
  uploadMethod: 'PUT';
  requiredHeaders: { 'Content-Type': string };
  expiresInSeconds: number;
}

@Injectable()
export class LibraryService {
  private readonly maxFileSizeBytes: number;

  constructor(
    @InjectRepository(LibraryTrackEntity)
    private readonly tracksRepository: Repository<LibraryTrackEntity>,
    private readonly storage: StorageService,
    private readonly analysisQueue: AudioAnalysisQueueService,
    configService: ConfigService,
  ) {
    this.maxFileSizeBytes = configService.get<number>(
      'AUDIO_MAX_FILE_SIZE_BYTES',
      52_428_800,
    );
  }

  async createUpload(
    ownerId: string,
    dto: CreateTrackUploadDto,
  ): Promise<TrackUploadResponse> {
    await this.cleanupExpired(ownerId);
    const file = this.validateFile(dto);
    await this.removeRepeatedFailures(
      ownerId,
      file.filename,
      dto.sizeBytes,
    );
    const id = randomUUID();
    const objectKey = `${ownerId}/${id}/source${file.extension}`;
    const signed = await this.storage.createUploadUrl(
      objectKey,
      file.contentType,
    );
    const entity = this.tracksRepository.create({
      id,
      ownerId,
      title: dto.title.trim(),
      artist: dto.artist?.trim() || null,
      notes: dto.notes?.trim() || null,
      originalFilename: file.filename,
      contentType: file.contentType,
      sizeBytes: dto.sizeBytes,
      objectKey,
      contentHash: null,
      status: LibraryTrackStatus.PENDING,
      errorMessage: null,
      uploadExpiresAt: new Date(Date.now() + signed.expiresInSeconds * 1_000),
      uploadedAt: null,
      analysisStatus: AudioAnalysisStatus.NONE,
      analysisProgress: 0,
      analysisError: null,
      analyzedAt: null,
      analysisVersion: null,
      analysisMethod: null,
      detectedFormat: null,
      codec: null,
      durationSeconds: null,
      sampleRateHz: null,
      channels: null,
      bitrateBps: null,
      estimatedBpm: null,
      bpmConfidence: null,
      estimatedKey: null,
      keyConfidence: null,
      genreTags: [],
      moodTags: [],
      instrumentTags: [],
    });
    const saved = await this.tracksRepository.save(entity);
    return {
      track: this.toResponse(saved),
      uploadUrl: signed.url,
      uploadMethod: 'PUT',
      requiredHeaders: { 'Content-Type': file.contentType },
      expiresInSeconds: signed.expiresInSeconds,
    };
  }

  async completeUpload(
    ownerId: string,
    trackId: string,
  ): Promise<LibraryTrackResponse> {
    const track = await this.getOwned(ownerId, trackId);
    if (track.status === LibraryTrackStatus.READY) {
      return this.toResponse(track);
    }
    if (track.status === LibraryTrackStatus.FAILED) {
      throw new BadRequestException(
        'Este envio falhou. Exclua o item e envie o arquivo novamente.',
      );
    }
    if (track.uploadExpiresAt.getTime() < Date.now()) {
      await this.failUpload(track, 'O tempo para concluir o envio expirou.');
    }

    const object = await this.storage.inspectObject(track.objectKey);
    if (object.sizeBytes !== track.sizeBytes) {
      await this.failUpload(
        track,
        'O tamanho recebido é diferente do tamanho informado.',
      );
    }
    if (!this.signatureMatches(track.contentType, object.signature)) {
      await this.failUpload(
        track,
        'O conteúdo do arquivo não corresponde a um MP3 ou WAV válido.',
      );
    }

    const contentHash = await this.storage.computeSha256(track.objectKey);
    await this.rejectDuplicate(ownerId, track, contentHash);

    track.status = LibraryTrackStatus.READY;
    track.analysisStatus = AudioAnalysisStatus.QUEUED;
    track.analysisProgress = 0;
    track.analysisError = null;
    track.contentHash = contentHash;
    track.errorMessage = null;
    track.uploadedAt = new Date();
    try {
      const saved = await this.tracksRepository.save(track);
      await this.analysisQueue.enqueue(saved.id);
      return this.toResponse(saved);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        await this.removeDuplicateUpload(track);
      }
      throw error;
    }
  }

  async list(ownerId: string): Promise<LibraryTrackResponse[]> {
    await this.cleanupExpired(ownerId);
    const tracks = await this.tracksRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });
    return tracks.map((track) => this.toResponse(track));
  }

  async playback(
    ownerId: string,
    trackId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const track = await this.getOwned(ownerId, trackId);
    if (track.status !== LibraryTrackStatus.READY) {
      throw new BadRequestException(
        'A faixa ainda não está pronta para reprodução.',
      );
    }
    return this.storage.createPlaybackUrl(
      track.objectKey,
      track.originalFilename,
      track.contentType,
    );
  }

  async reprocess(
    ownerId: string,
    trackId: string,
  ): Promise<LibraryTrackResponse> {
    const track = await this.getOwned(ownerId, trackId);
    if (track.status !== LibraryTrackStatus.READY) {
      throw new BadRequestException(
        'Somente uma faixa pronta pode ser reprocessada.',
      );
    }
    if (track.analysisStatus === AudioAnalysisStatus.PROCESSING) {
      throw new ConflictException('Esta faixa já está sendo analisada.');
    }
    this.clearAnalysis(track);
    track.analysisStatus = AudioAnalysisStatus.QUEUED;
    await this.tracksRepository.save(track);
    await this.analysisQueue.enqueue(track.id);
    return this.toResponse(track);
  }

  async remove(ownerId: string, trackId: string): Promise<void> {
    const track = await this.getOwned(ownerId, trackId);
    await this.storage.deleteObject(track.objectKey);
    await this.tracksRepository.remove(track);
  }

  private validateFile(dto: CreateTrackUploadDto): {
    filename: string;
    extension: '.mp3' | '.wav';
    contentType: 'audio/mpeg' | 'audio/wav';
  } {
    const filename = dto.filename.trim().replace(/\\/g, '/').split('/').at(-1);
    if (!filename || filename.length > 255) {
      throw new BadRequestException('O nome do arquivo é inválido.');
    }
    if (dto.sizeBytes > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `O arquivo excede o limite de ${Math.floor(this.maxFileSizeBytes / 1_048_576)} MB.`,
      );
    }

    const extension = extname(filename).toLocaleLowerCase();
    const type = dto.contentType.toLocaleLowerCase().split(';', 1)[0].trim();
    if (extension === '.mp3' && ['audio/mpeg', 'audio/mp3'].includes(type)) {
      return { filename, extension, contentType: 'audio/mpeg' };
    }
    if (
      extension === '.wav' &&
      ['audio/wav', 'audio/x-wav', 'audio/wave'].includes(type)
    ) {
      return { filename, extension, contentType: 'audio/wav' };
    }
    throw new BadRequestException(
      'Envie um arquivo MP3 ou WAV com extensão e tipo compatíveis.',
    );
  }

  private signatureMatches(contentType: string, bytes: Uint8Array): boolean {
    if (contentType === 'audio/mpeg') {
      if (String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') return false;
      for (let index = 0; index <= bytes.length - 3; index++) {
        const hasId3 =
          bytes[index] === 0x49 &&
          bytes[index + 1] === 0x44 &&
          bytes[index + 2] === 0x33;
        if (
          hasId3 ||
          (index <= bytes.length - 4 &&
            this.hasMpegFrameHeader(bytes, index))
        ) {
          return true;
        }
      }
      return false;
    }
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WAVE'
    );
  }

  private hasMpegFrameHeader(bytes: Uint8Array, index: number): boolean {
    if (bytes[index] !== 0xff || (bytes[index + 1] & 0xe0) !== 0xe0) {
      return false;
    }
    const version = (bytes[index + 1] >> 3) & 0x03;
    const layer = (bytes[index + 1] >> 1) & 0x03;
    const bitrate = (bytes[index + 2] >> 4) & 0x0f;
    const sampleRate = (bytes[index + 2] >> 2) & 0x03;
    return (
      version !== 0x01 &&
      layer !== 0x00 &&
      bitrate !== 0x00 &&
      bitrate !== 0x0f &&
      sampleRate !== 0x03
    );
  }

  private async rejectDuplicate(
    ownerId: string,
    current: LibraryTrackEntity,
    contentHash: string,
  ): Promise<void> {
    const existingTracks = await this.tracksRepository.find({
      where: { ownerId, status: LibraryTrackStatus.READY },
    });
    for (const existing of existingTracks) {
      if (existing.id === current.id) continue;
      let existingHash = existing.contentHash;
      if (!existingHash) {
        try {
          existingHash = await this.storage.computeSha256(existing.objectKey);
          existing.contentHash = existingHash;
          await this.tracksRepository.save(existing);
        } catch {
          existingHash = null;
        }
      }
      if (existingHash === contentHash) {
        await this.removeDuplicateUpload(current);
      }
    }
  }

  private async removeDuplicateUpload(track: LibraryTrackEntity): Promise<never> {
    await this.storage.deleteObject(track.objectKey);
    await this.tracksRepository.remove(track);
    throw new ConflictException('Este arquivo já existe no seu acervo.');
  }

  private async removeRepeatedFailures(
    ownerId: string,
    originalFilename: string,
    sizeBytes: number,
  ): Promise<void> {
    const repeated = await this.tracksRepository.findBy({
      ownerId,
      originalFilename,
      sizeBytes,
      status: LibraryTrackStatus.FAILED,
    });
    if (repeated.length > 0) await this.tracksRepository.remove(repeated);
  }

  private async failUpload(
    track: LibraryTrackEntity,
    message: string,
  ): Promise<never> {
    await this.storage.deleteObject(track.objectKey);
    track.status = LibraryTrackStatus.FAILED;
    track.errorMessage = message;
    await this.tracksRepository.save(track);
    throw new BadRequestException(message);
  }

  private async getOwned(
    ownerId: string,
    id: string,
  ): Promise<LibraryTrackEntity> {
    const track = await this.tracksRepository.findOneBy({ id, ownerId });
    if (!track) throw new NotFoundException('Faixa não encontrada.');
    return track;
  }

  private async cleanupExpired(ownerId: string): Promise<void> {
    const expired = await this.tracksRepository.findBy({
      ownerId,
      status: LibraryTrackStatus.PENDING,
      uploadExpiresAt: LessThan(new Date()),
    });
    for (const track of expired) {
      try {
        await this.storage.deleteObject(track.objectKey);
        await this.tracksRepository.remove(track);
      } catch {
        // Mantém o registro para uma próxima tentativa de limpeza.
      }
    }
  }

  toResponse(track: LibraryTrackEntity): LibraryTrackResponse {
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      notes: track.notes,
      originalFilename: track.originalFilename,
      contentType: track.contentType,
      sizeBytes: track.sizeBytes,
      status: track.status,
      errorMessage: track.errorMessage,
      uploadedAt: track.uploadedAt,
      analysisStatus: track.analysisStatus,
      analysisProgress: track.analysisProgress,
      analysisError: track.analysisError,
      analyzedAt: track.analyzedAt,
      analysisVersion: track.analysisVersion,
      analysisMethod: track.analysisMethod,
      detectedFormat: track.detectedFormat,
      codec: track.codec,
      durationSeconds: track.durationSeconds,
      sampleRateHz: track.sampleRateHz,
      channels: track.channels,
      bitrateBps: track.bitrateBps,
      estimatedBpm: track.estimatedBpm,
      bpmConfidence: track.bpmConfidence,
      estimatedKey: track.estimatedKey,
      keyConfidence: track.keyConfidence,
      genreTags: track.genreTags ?? [],
      moodTags: track.moodTags ?? [],
      instrumentTags: track.instrumentTags ?? [],
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    };
  }

  private clearAnalysis(track: LibraryTrackEntity): void {
    Object.assign(track, {
      analysisProgress: 0,
      analysisError: null,
      analyzedAt: null,
      analysisVersion: null,
      analysisMethod: null,
      detectedFormat: null,
      codec: null,
      durationSeconds: null,
      sampleRateHz: null,
      channels: null,
      bitrateBps: null,
      estimatedBpm: null,
      bpmConfidence: null,
      estimatedKey: null,
      keyConfidence: null,
      genreTags: [],
      moodTags: [],
      instrumentTags: [],
    });
  }
}
