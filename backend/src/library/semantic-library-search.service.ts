import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SearchLibraryDto } from './dto/search-library.dto';
import { LibraryTrackEntity } from './library-track.entity';
import { LibraryTrackStatus } from './library-track-status.enum';
import { CloudflareEmbeddingsService } from './cloudflare-embeddings.service';
import { LibraryService, LibraryTrackResponse } from './library.service';
import { QueryEmbeddingCacheService } from './query-embedding-cache.service';

export interface LibrarySearchResult extends LibraryTrackResponse {
  matchScore: number;
}

export interface LibrarySearchResponse {
  query: string;
  mode: 'semantic' | 'metadata';
  notice: string | null;
  results: LibrarySearchResult[];
}

interface StoredEmbedding { track_id: string; text_hash: string; model: string; }
interface SimilarityRow { track_id: string; score: string | number; }

@Injectable()
export class SemanticLibrarySearchService {
  private readonly logger = new Logger(SemanticLibrarySearchService.name);

  constructor(
    @InjectRepository(LibraryTrackEntity)
    private readonly tracks: Repository<LibraryTrackEntity>,
    private readonly dataSource: DataSource,
    private readonly embeddings: CloudflareEmbeddingsService,
    private readonly library: LibraryService,
    private readonly queryCache: QueryEmbeddingCacheService,
  ) {}

  async search(ownerId: string, dto: SearchLibraryDto): Promise<LibrarySearchResponse> {
    const startedAt = performance.now();
    const query = dto.q.trim();
    const candidates = (await this.tracks.find({
      where: { ownerId, status: LibraryTrackStatus.READY },
      order: { updatedAt: 'DESC' },
    })).filter((track) => this.matchesFilters(track, dto));
    const tracksMs = Math.round(performance.now() - startedAt);
    if (!candidates.length) return { query, mode: 'metadata', notice: null, results: [] };

    try {
      if (!this.embeddings.configured) throw new Error('not-configured');
      const indexingStartedAt = performance.now();
      await this.ensureIndexed(candidates);
      const indexingMs = Math.round(performance.now() - indexingStartedAt);
      const queryStartedAt = performance.now();
      const { vector: queryVector, cache } = await this.queryCache.get(ownerId, this.queryText(query));
      const queryEmbeddingMs = Math.round(performance.now() - queryStartedAt);
      const rankingStartedAt = performance.now();
      const similarityResult = await this.dataSource.query<SimilarityRow[]>(`
        SELECT e."track_id", 1 - (e."embedding" <=> $2::vector) AS "score"
        FROM "library_track_embeddings" e
        INNER JOIN "library_tracks" t ON t."id" = e."track_id"
        WHERE t."owner_id" = $1 AND t."status" = 'ready' AND e."model" = $3
        ORDER BY e."embedding" <=> $2::vector
        LIMIT 50
      `, [ownerId, this.vectorLiteral(queryVector), this.embeddings.model]);
      const rankingMs = Math.round(performance.now() - rankingStartedAt);
      const rows = this.queryRows<SimilarityRow>(similarityResult);
      const scores = new Map(rows.map((row) => [row.track_id, Number(row.score)]));
      const results = candidates
        .filter((track) => scores.has(track.id))
        .map((track) => ({ ...this.library.toResponse(track), matchScore: this.score(scores.get(track.id) ?? 0) }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20);
      this.logger.log(JSON.stringify({
        event: 'semantic-search', queryCache: cache, tracksMs, indexingMs,
        queryEmbeddingMs, rankingMs, totalMs: Math.round(performance.now() - startedAt),
      }));
      return { query, mode: 'semantic', notice: null, results };
    } catch (error) {
      this.logger.warn(`Busca semântica indisponível; usando metadados: ${this.safeMessage(error)}`);
      this.logger.log(JSON.stringify({ event: 'semantic-search-fallback', totalMs: Math.round(performance.now() - startedAt) }));
      return {
        query,
        mode: 'metadata',
        notice: this.embeddings.configured
          ? 'A busca semântica está temporariamente indisponível. Os resultados usam título, artista, observações e tags.'
          : 'Configure a Cloudflare no backend para ativar a busca semântica. Por enquanto, os resultados usam os metadados.',
        results: this.metadataResults(candidates, query),
      };
    }
  }

  private async ensureIndexed(tracks: LibraryTrackEntity[]): Promise<void> {
    const storedResult = await this.dataSource.query<StoredEmbedding[]>(`
      SELECT "track_id", "text_hash", "model" FROM "library_track_embeddings"
      WHERE "track_id" = ANY($1::uuid[])
    `, [tracks.map((track) => track.id)]);
    const stored = this.queryRows<StoredEmbedding>(storedResult);
    const current = new Map(stored.map((item) => [item.track_id, item]));
    const pending = tracks.map((track) => {
      const text = this.trackText(track);
      return { track, text, hash: createHash('sha256').update(text).digest('hex') };
    }).filter(({ track, hash }) => {
      const item = current.get(track.id);
      return !item || item.text_hash !== hash || item.model !== this.embeddings.model;
    });

    for (let offset = 0; offset < pending.length; offset += 25) {
      const batch = pending.slice(offset, offset + 25);
      const vectors = await this.embeddings.embed(batch.map((item) => item.text));
      for (let index = 0; index < batch.length; index += 1) {
        const item = batch[index];
        await this.dataSource.query(`
          INSERT INTO "library_track_embeddings"
            ("track_id", "model", "dimensions", "text_hash", "embedding", "embedded_at")
          VALUES ($1, $2, $3, $4, $5::vector, now())
          ON CONFLICT ("track_id") DO UPDATE SET
            "model" = EXCLUDED."model", "dimensions" = EXCLUDED."dimensions",
            "text_hash" = EXCLUDED."text_hash", "embedding" = EXCLUDED."embedding", "embedded_at" = now()
        `, [item.track.id, this.embeddings.model, this.embeddings.dimensions, item.hash, this.vectorLiteral(vectors[index])]);
      }
    }
  }

  private trackText(track: LibraryTrackEntity): string {
    return [
      `Título: ${track.title}.`, track.artist ? `Artista: ${track.artist}.` : '',
      track.notes ? `Descrição: ${track.notes}.` : '',
      track.estimatedBpm ? `BPM aproximado: ${Math.round(track.estimatedBpm)}.` : '',
      track.estimatedKey ? `Tonalidade: ${track.estimatedKey}.` : '',
      track.genreTags.length ? `Gêneros: ${track.genreTags.join(', ')}.` : '',
      track.moodTags.length ? `Clima: ${track.moodTags.join(', ')}.` : '',
      track.instrumentTags.length ? `Instrumentação: ${track.instrumentTags.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
  }

  private queryText(query: string): string {
    return `Encontre uma faixa musical adequada para esta descrição: ${query}`;
  }

  private matchesFilters(track: LibraryTrackEntity, dto: SearchLibraryDto): boolean {
    if (dto.bpmMin !== undefined && (track.estimatedBpm === null || track.estimatedBpm < dto.bpmMin)) return false;
    if (dto.bpmMax !== undefined && (track.estimatedBpm === null || track.estimatedBpm > dto.bpmMax)) return false;
    if (dto.genre && !this.contains(track.genreTags, dto.genre)) return false;
    if (dto.instrument && !this.contains(track.instrumentTags, dto.instrument)) return false;
    return true;
  }

  private contains(values: string[], expected: string): boolean {
    const normalized = this.normalize(expected);
    return values.some((value) => this.normalize(value).includes(normalized));
  }

  private metadataResults(tracks: LibraryTrackEntity[], query: string): LibrarySearchResult[] {
    const terms = [...new Set(this.normalize(query).split(/\s+/).filter((term) => term.length > 2))];
    return tracks.map((track) => {
      const text = this.normalize(this.trackText(track));
      const matches = terms.filter((term) => text.includes(term)).length;
      return { ...this.library.toResponse(track), matchScore: terms.length ? this.score(matches / terms.length) : 0 };
    }).filter((track) => track.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  }

  private vectorLiteral(vector: number[]): string {
    return `[${vector.map((value) => Number(value).toString()).join(',')}]`;
  }

  private score(value: number): number {
    return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
  }

  private safeMessage(error: unknown): string {
    return error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 300) : 'erro desconhecido';
  }

  private queryRows<T>(result: unknown): T[] {
    if (!Array.isArray(result)) return [];
    return Array.isArray(result[0]) ? result[0] as T[] : result as T[];
  }
}
