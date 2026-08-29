import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { LibraryService } from './library.service';
import { LibraryTrackEntity } from './library-track.entity';
import { LibraryTrackStatus } from './library-track-status.enum';
import { StorageService } from './storage.service';

function setup(existing: LibraryTrackEntity | null = null) {
  const now = new Date();
  const repository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      createdAt: now,
      updatedAt: now,
      ...value,
    })),
    findOneBy: jest.fn().mockResolvedValue(existing),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    remove: jest.fn().mockResolvedValue(existing),
  } as unknown as jest.Mocked<Repository<LibraryTrackEntity>>;
  const storage = {
    createUploadUrl: jest.fn().mockResolvedValue({
      url: 'http://storage.test/upload',
      expiresInSeconds: 900,
    }),
    inspectObject: jest.fn().mockResolvedValue({
      sizeBytes: existing?.sizeBytes ?? 3,
      contentType: existing?.contentType ?? 'audio/mpeg',
      signature: Uint8Array.from([0x49, 0x44, 0x33]),
    }),
    computeSha256: jest.fn().mockResolvedValue('b'.repeat(64)),
    createPlaybackUrl: jest.fn().mockResolvedValue({
      url: 'http://storage.test/play',
      expiresInSeconds: 900,
    }),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StorageService>;
  const config = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  } as unknown as ConfigService;
  return {
    repository,
    storage,
    service: new LibraryService(repository, storage, config),
  };
}

function pendingTrack(): LibraryTrackEntity {
  const now = new Date();
  return {
    id: '1d87a363-b028-4212-b7b7-3d7abebf88ac',
    ownerId: 'a3c99009-01a7-48d6-a2b1-7ea32f66dc1b',
    title: 'Demo',
    artist: null,
    notes: null,
    originalFilename: 'demo.mp3',
    contentType: 'audio/mpeg',
    sizeBytes: 3,
    objectKey: 'owner/track/source.mp3',
    contentHash: null,
    status: LibraryTrackStatus.PENDING,
    errorMessage: null,
    uploadExpiresAt: new Date(Date.now() + 60_000),
    uploadedAt: null,
    createdAt: now,
    updatedAt: now,
  } as LibraryTrackEntity;
}

describe('LibraryService', () => {
  it('creates a private presigned upload for a valid MP3', async () => {
    const { service, storage, repository } = setup();

    const result = await service.createUpload('owner-id', {
      filename: '../demo.mp3',
      contentType: 'audio/mpeg',
      sizeBytes: 2_048,
      title: ' Minha demo ',
      artist: 'Artista',
    });

    expect(result.uploadMethod).toBe('PUT');
    expect(result.requiredHeaders).toEqual({ 'Content-Type': 'audio/mpeg' });
    expect(result.track).not.toHaveProperty('objectKey');
    expect(storage.createUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^owner-id\/.+\/source\.mp3$/),
      'audio/mpeg',
    );
    expect(repository.save).toHaveBeenCalled();
  });

  it('verifies the file signature before marking the track ready', async () => {
    const track = pendingTrack();
    const { service, storage } = setup(track);
    storage.inspectObject.mockResolvedValue({
      sizeBytes: track.sizeBytes,
      contentType: 'audio/mpeg',
      signature: Uint8Array.from([0x00, 0x00, 0xff, 0xfb, 0x90, 0x64]),
    });

    const result = await service.completeUpload(track.ownerId, track.id);

    expect(result.status).toBe('ready');
    expect(result.uploadedAt).toBeInstanceOf(Date);
  });

  it('removes invalid content from storage and records the failure', async () => {
    const track = pendingTrack();
    const { service, storage, repository } = setup(track);
    storage.inspectObject.mockResolvedValue({
      sizeBytes: 3,
      contentType: 'audio/mpeg',
      signature: Uint8Array.from([0x50, 0x44, 0x46]),
    });

    await expect(service.completeUpload(track.ownerId, track.id)).rejects.toThrow(
      'O conteúdo do arquivo não corresponde a um MP3 ou WAV válido.',
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(track.objectKey);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: LibraryTrackStatus.FAILED }),
    );
  });

  it('rejects an extension that does not match an allowed audio format', async () => {
    const { service, storage } = setup();

    await expect(
      service.createUpload('owner-id', {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
        sizeBytes: 100,
        title: 'Inválido',
      }),
    ).rejects.toThrow('Envie um arquivo MP3 ou WAV');
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it('removes a second upload when the content already exists', async () => {
    const track = pendingTrack();
    const { service, storage, repository } = setup(track);
    storage.computeSha256.mockResolvedValue('a'.repeat(64));
    repository.find.mockResolvedValue([
      {
        ...pendingTrack(),
        id: '6759a2d3-dca3-489e-855e-9304ee310a45',
        status: LibraryTrackStatus.READY,
        contentHash: 'a'.repeat(64),
      } as LibraryTrackEntity,
    ]);

    await expect(service.completeUpload(track.ownerId, track.id)).rejects.toThrow(
      'Este arquivo já existe no seu acervo.',
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(track.objectKey);
    expect(repository.remove).toHaveBeenCalledWith(track);
  });
});
