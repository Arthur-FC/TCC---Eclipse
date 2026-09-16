import { BadRequestException, ConflictException } from '@nestjs/common';
import { unzipSync } from 'fflate';
import { ReferenceStatus } from '../references/reference-status.enum';
import { StemSeparationService } from './stem-separation.service';

describe('StemSeparationService', () => {
  function setup(status = ReferenceStatus.APPROVED, libraryTrackId: string | null = 'track-1') {
    const reference = { id: 'ref-1', projectId: 'project-1', status, libraryTrackId };
    const track = { id: 'track-1', ownerId: 'owner-1', status: 'ready' };
    const references = { findOneBy: jest.fn().mockResolvedValue(reference), findBy: jest.fn() };
    const tracks = { findOneBy: jest.fn().mockResolvedValue(track) };
    const separations = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'separation-1', createdAt: new Date(), updatedAt: new Date(), ...value })),
      find: jest.fn(),
    };
    const stems = { findBy: jest.fn().mockResolvedValue([]), remove: jest.fn() };
    const jobs = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const projects = { getActiveProject: jest.fn().mockResolvedValue({ id: 'project-1' }) };
    const storage = { deleteObject: jest.fn(), createPlaybackUrl: jest.fn(), createDownloadUrl: jest.fn(), getObjectBytes: jest.fn() };
    const config = { get: jest.fn((_key, fallback) => fallback) };
    const service = new StemSeparationService(
      references as never, tracks as never, separations as never, stems as never,
      jobs as never, projects as never, storage as never, config as never,
    );
    return { service, jobs, tracks, separations, stems, storage };
  }

  it('coloca uma referência aprovada do acervo na fila', async () => {
    const { service, jobs } = setup();
    const result = await service.start('owner-1', 'project-1', 'ref-1');
    expect(result.status).toBe('queued');
    expect(jobs.save).toHaveBeenCalledWith(expect.objectContaining({ separationId: 'separation-1', status: 'queued' }));
  });

  it('recusa referência que ainda não foi aprovada', async () => {
    const { service } = setup(ReferenceStatus.PENDING);
    await expect(service.start('owner-1', 'project-1', 'ref-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('exige áudio autorizado para referência externa', async () => {
    const { service, tracks } = setup(ReferenceStatus.APPROVED, null);
    await expect(service.start('owner-1', 'project-1', 'ref-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tracks.findOneBy).not.toHaveBeenCalled();
  });

  it('refaz uma separação antiga que ainda não possui os instrumentos individuais', async () => {
    const { service, jobs, separations, stems, storage } = setup();
    separations.findOneBy.mockResolvedValue({
      id: 'separation-1', referenceId: 'ref-1', inputTrackId: 'track-1',
      status: 'completed', progress: 100, modelName: 'htdemucs', modelVersion: 'demucs-v4',
      errorMessage: null, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });
    stems.findBy.mockResolvedValue([
      { id: 'stem-vocals', separationId: 'separation-1', type: 'vocals', objectKey: 'vocals.wav', sizeBytes: 10 },
      { id: 'stem-instrumental', separationId: 'separation-1', type: 'instrumental', objectKey: 'instrumental.wav', sizeBytes: 10 },
    ]);

    const result = await service.start('owner-1', 'project-1', 'ref-1');

    expect(result.status).toBe('queued');
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(jobs.save).toHaveBeenCalledWith(expect.objectContaining({ separationId: 'separation-1', status: 'queued' }));
  });

  it('gera um único ZIP com todos os instrumentos separados', async () => {
    const { service, separations, stems, storage } = setup();
    separations.findOneBy.mockResolvedValue({ id: 'separation-1', status: 'completed' });
    stems.findBy.mockResolvedValue(['drums', 'bass', 'guitar', 'piano', 'other'].map(type => ({
      separationId: 'separation-1', type, objectKey: `${type}.wav`,
    })));
    storage.getObjectBytes.mockImplementation(async (key: string) => Buffer.from(key));

    const archive = await service.instrumentArchive('owner-1', 'project-1', 'ref-1');
    const files = unzipSync(archive.buffer);

    expect(archive.filename).toBe('instrumentos-separados.zip');
    expect(Object.keys(files).sort()).toEqual([
      'baixo.wav', 'bateria.wav', 'guitarra.wav', 'outros-instrumentos.wav', 'piano.wav',
    ]);
  });
});
