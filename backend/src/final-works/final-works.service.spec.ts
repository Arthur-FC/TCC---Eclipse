import { ConflictException, NotFoundException } from '@nestjs/common';
import { BriefingStatus } from '../briefings/briefing.entity';
import { FinalWorksService } from './final-works.service';

describe('FinalWorksService', () => {
  const project = { id: 'project-1', ownerId: 'owner-1', title: 'Canção lunar' };
  const briefing = {
    id: 'briefing-1', version: 2, status: BriefingStatus.CONFIRMED,
    confirmedAt: new Date('2026-09-01T12:00:00Z'), data: { genres: ['MPB'], mood: ['íntimo'] },
  };
  const selection = {
    confirmedAt: new Date(), snapshotHash: 'hash', referenceIds: ['reference-1'],
  };
  const moodboard = {
    id: 'moodboard-1', version: 3, briefingVersion: 2, selectionHash: 'hash',
    createdAt: new Date('2026-09-02T12:00:00Z'), data: { title: 'Noite violeta' },
  };
  const reference = {
    id: 'reference-1', source: 'spotify', title: 'Referência', creator: 'Artista',
    album: null, description: 'Violão delicado',
  };

  function setup(overrides: { project?: unknown; briefing?: unknown; selection?: unknown; moodboard?: unknown } = {}) {
    const projects = {
      findOneBy: jest.fn().mockResolvedValue(overrides.project === undefined ? project : overrides.project),
      existsBy: jest.fn().mockResolvedValue(true),
    };
    const briefings = { findOne: jest.fn().mockResolvedValue(overrides.briefing === undefined ? briefing : overrides.briefing) };
    const moodboards = { findOne: jest.fn().mockResolvedValue(overrides.moodboard === undefined ? moodboard : overrides.moodboard) };
    const references = { findBy: jest.fn().mockResolvedValue([reference]) };
    const selections = { findOneBy: jest.fn().mockResolvedValue(overrides.selection === undefined ? selection : overrides.selection) };
    const library = {
      createUpload: jest.fn().mockResolvedValue({ track: { id: 'track-1' } }),
      completeFinalWork: jest.fn(), listFinalWorks: jest.fn(),
    };
    const service = new FinalWorksService(
      projects as never, briefings as never, moodboards as never,
      references as never, selections as never, library as never,
    );
    return { service, library };
  }

  it('reserva uma faixa com versão criativa imutável', async () => {
    const { service, library } = setup();
    const dto = { filename: 'final.wav', contentType: 'audio/wav', sizeBytes: 100, title: 'Final' };

    await service.createUpload('owner-1', 'project-1', dto);

    expect(library.createUpload).toHaveBeenCalledWith('owner-1', dto, expect.objectContaining({
      projectId: 'project-1',
      origin: expect.objectContaining({
        briefing: expect.objectContaining({ version: 2 }),
        moodboard: expect.objectContaining({ version: 3 }),
        references: [expect.objectContaining({ id: 'reference-1' })],
        searchText: expect.stringContaining('Violão delicado'),
      }),
    }));
  });

  it('recusa projeto que não pertence ao usuário', async () => {
    const { service } = setup({ project: null });
    await expect(service.createUpload('owner-2', 'project-1', {} as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exige moodboard vigente', async () => {
    const { service } = setup({ moodboard: null });
    await expect(service.createUpload('owner-1', 'project-1', {} as never)).rejects.toBeInstanceOf(ConflictException);
  });
});
