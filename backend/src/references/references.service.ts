import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BriefingData } from '../briefings/briefing-data';
import { BriefingsService } from '../briefings/briefings.service';
import { ProjectsService } from '../projects/projects.service';
import { MusicReferenceEntity } from './music-reference.entity';
import { ReferenceSource, ReferenceStatus } from './reference-status.enum';
import { YouTubeClient } from './youtube.client';
import { SpotifyClient } from './spotify.client';
import { parseSpotifyTrackLink } from './spotify-link';

export interface ReferenceSearchResponse {
  query: string;
  fromCache: boolean;
  items: MusicReferenceEntity[];
}

@Injectable()
export class ReferencesService {
  constructor(
    @InjectRepository(MusicReferenceEntity)
    private readonly referencesRepository: Repository<MusicReferenceEntity>,
    private readonly projectsService: ProjectsService,
    private readonly briefingsService: BriefingsService,
    private readonly youtubeClient: YouTubeClient,
    private readonly spotifyClient: SpotifyClient,
  ) {}

  async searchYouTube(
    ownerId: string,
    projectId: string,
    refresh: boolean,
  ): Promise<ReferenceSearchResponse> {
    await this.projectsService.getActiveProject(ownerId, projectId);
    let briefing;
    try {
      briefing = await this.briefingsService.requireConfirmedBriefing(
        ownerId,
        projectId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ConflictException(
          'Confirme o briefing antes de pesquisar no YouTube.',
        );
      }
      throw error;
    }
    const query = this.buildSearchQuery(briefing.data);
    const search = await this.youtubeClient.search(query, refresh);
    const ids = search.items.map((item) => item.externalId);
    const existing = ids.length
      ? await this.referencesRepository.findBy({
          projectId,
          source: ReferenceSource.YOUTUBE,
          externalId: In(ids),
        })
      : [];
    const existingById = new Map(existing.map((item) => [item.externalId, item]));
    const entities = search.items.map((item) => {
      const reference = existingById.get(item.externalId);
      if (reference) {
        Object.assign(reference, item, { searchQuery: search.query });
        return reference;
      }
      return this.referencesRepository.create({
        ...item,
        projectId,
        source: ReferenceSource.YOUTUBE,
        searchQuery: search.query,
        status: ReferenceStatus.PENDING,
      });
    });
    if (entities.length > 0) await this.referencesRepository.save(entities);
    return {
      query: search.query,
      fromCache: search.fromCache,
      items: await this.list(ownerId, projectId),
    };
  }

  async list(
    ownerId: string,
    projectId: string,
  ): Promise<MusicReferenceEntity[]> {
    await this.projectsService.getProject(ownerId, projectId);
    return this.referencesRepository.find({
      where: { projectId },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });
  }

  async addSpotify(
    ownerId: string,
    projectId: string,
    link: string,
  ): Promise<MusicReferenceEntity> {
    await this.projectsService.getActiveProject(ownerId, projectId);
    const parsed = parseSpotifyTrackLink(link);
    const track = await this.spotifyClient.getTrack(parsed.trackId);
    const existing = await this.referencesRepository.findOneBy({
      projectId,
      source: ReferenceSource.SPOTIFY,
      externalId: track.externalId,
    });
    const values = {
      ...track,
      projectId,
      source: ReferenceSource.SPOTIFY,
      searchQuery: parsed.canonicalUrl,
    };

    if (existing) {
      Object.assign(existing, values);
      return this.referencesRepository.save(existing);
    }
    return this.referencesRepository.save(
      this.referencesRepository.create({
        ...values,
        status: ReferenceStatus.PENDING,
      }),
    );
  }

  async updateStatus(
    ownerId: string,
    projectId: string,
    referenceId: string,
    status: ReferenceStatus,
  ): Promise<MusicReferenceEntity> {
    await this.projectsService.getActiveProject(ownerId, projectId);
    const reference = await this.referencesRepository.findOneBy({
      id: referenceId,
      projectId,
    });
    if (!reference) throw new NotFoundException('Referência não encontrada.');
    reference.status = status;
    return this.referencesRepository.save(reference);
  }

  private buildSearchQuery(data: BriefingData): string {
    const mainTopic = (data.theme ?? data.objective ?? '')
      .split(/[,.!?;:\n]/, 1)[0]
      .trim()
      .slice(0, 60)
      .trim();
    const values = [
      mainTopic,
      ...data.genres.slice(0, 1),
      ...data.mood.slice(0, 1),
      'música',
    ]
      .filter((value): value is string => !!value)
      .map((value) => value.trim())
      .filter(
        (value, index, all) =>
          all.findIndex(
            (candidate) => candidate.toLocaleLowerCase('pt-BR') ===
              value.toLocaleLowerCase('pt-BR'),
          ) === index,
      );
    return values.join(' ').replace(/\s+/g, ' ').trim();
  }
}
