import { BadRequestException, ConflictException } from '@nestjs/common';
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
    const storage = { deleteObject: jest.fn(), createPlaybackUrl: jest.fn(), createDownloadUrl: jest.fn() };
    const config = { get: jest.fn((_key, fallback) => fallback) };
    const service = new StemSeparationService(
      references as never, tracks as never, separations as never, stems as never,
      jobs as never, projects as never, storage as never, config as never,
    );
    return { service, jobs, tracks };
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
});
