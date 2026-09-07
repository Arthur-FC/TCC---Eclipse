import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BriefingEntity, BriefingStatus } from '../briefings/briefing.entity';
import { LibraryService, LibraryTrackResponse, TrackUploadResponse } from '../library/library.service';
import { MoodboardEntity } from '../moodboards/moodboard.entity';
import { ProjectEntity } from '../projects/project.entity';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { ReferenceSelectionEntity } from '../references/reference-selection.entity';
import { CreateFinalWorkUploadDto } from './dto/create-final-work-upload.dto';

@Injectable()
export class FinalWorksService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(BriefingEntity) private readonly briefings: Repository<BriefingEntity>,
    @InjectRepository(MoodboardEntity) private readonly moodboards: Repository<MoodboardEntity>,
    @InjectRepository(MusicReferenceEntity) private readonly references: Repository<MusicReferenceEntity>,
    @InjectRepository(ReferenceSelectionEntity) private readonly selections: Repository<ReferenceSelectionEntity>,
    private readonly library: LibraryService,
  ) {}

  async createUpload(ownerId: string, projectId: string, dto: CreateFinalWorkUploadDto): Promise<TrackUploadResponse> {
    const project = await this.projects.findOneBy({ id: projectId, ownerId, archivedAt: IsNull() });
    if (!project) throw new NotFoundException('Projeto ativo não encontrado.');
    const briefing = await this.briefings.findOne({ where: { projectId }, order: { version: 'DESC' } });
    if (!briefing || briefing.status !== BriefingStatus.CONFIRMED) {
      throw new ConflictException('Confirme o briefing antes de registrar a obra final.');
    }
    const selection = await this.selections.findOneBy({ projectId });
    if (!selection?.confirmedAt) {
      throw new ConflictException('Confirme as referências antes de registrar a obra final.');
    }
    const moodboard = await this.moodboards.findOne({
      where: { projectId, briefingVersion: briefing.version, selectionHash: selection.snapshotHash },
      order: { version: 'DESC' },
    });
    if (!moodboard) {
      throw new ConflictException('Gere um moodboard vigente antes de registrar a obra final.');
    }
    const references = await this.references.findBy({ projectId });
    const selected = selection.referenceIds
      .map((id) => references.find((reference) => reference.id === id))
      .filter((reference): reference is MusicReferenceEntity => !!reference)
      .map((reference) => ({
        id: reference.id, source: reference.source, title: reference.title,
        creator: reference.creator, album: reference.album, description: reference.description,
      }));
    if (selected.length !== selection.referenceIds.length) {
      throw new ConflictException('Uma referência da seleção não está mais disponível.');
    }
    const searchText = [
      `Obra final do projeto ${project.title}.`,
      JSON.stringify(briefing.data),
      JSON.stringify(moodboard.data),
      selected.map((reference) => `${reference.title} ${reference.creator} ${reference.description}`).join(' '),
    ].join(' ').slice(0, 12_000);
    return this.library.createUpload(ownerId, dto, {
      projectId,
      projectTitle: project.title,
      origin: {
        project: { id: project.id, title: project.title },
        briefing: { id: briefing.id, version: briefing.version, data: briefing.data, confirmedAt: briefing.confirmedAt?.toISOString() ?? null },
        moodboard: { id: moodboard.id, version: moodboard.version, data: moodboard.data, createdAt: moodboard.createdAt.toISOString() },
        references: selected,
        searchText,
      },
    });
  }

  async complete(ownerId: string, projectId: string, trackId: string): Promise<LibraryTrackResponse> {
    await this.requireOwnedProject(ownerId, projectId);
    return this.library.completeFinalWork(ownerId, projectId, trackId);
  }

  async list(ownerId: string, projectId: string): Promise<LibraryTrackResponse[]> {
    await this.requireOwnedProject(ownerId, projectId);
    return this.library.listFinalWorks(ownerId, projectId);
  }

  private async requireOwnedProject(ownerId: string, projectId: string): Promise<void> {
    if (!(await this.projects.existsBy({ id: projectId, ownerId }))) {
      throw new NotFoundException('Projeto não encontrado.');
    }
  }
}
