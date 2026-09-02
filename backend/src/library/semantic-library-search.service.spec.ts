import { DataSource, Repository } from 'typeorm';
import { AudioAnalysisStatus } from './audio-analysis-status.enum';
import { CloudflareEmbeddingsService } from './cloudflare-embeddings.service';
import { LibraryTrackEntity } from './library-track.entity';
import { LibraryTrackStatus } from './library-track-status.enum';
import { LibraryService } from './library.service';
import { SemanticLibrarySearchService } from './semantic-library-search.service';
import { QueryEmbeddingCacheService } from './query-embedding-cache.service';

function track(overrides: Partial<LibraryTrackEntity> = {}): LibraryTrackEntity {
  const now = new Date();
  return {
    id: 'a3c99009-01a7-48d6-a2b1-7ea32f66dc1b', ownerId: 'owner-id', title: 'Lua acústica',
    artist: 'Eclipse', notes: 'Canção calma e noturna', originalFilename: 'lua.wav',
    contentType: 'audio/wav', sizeBytes: 100, objectKey: 'owner/track.wav', contentHash: 'a'.repeat(64),
    status: LibraryTrackStatus.READY, errorMessage: null, uploadExpiresAt: now, uploadedAt: now,
    analysisStatus: AudioAnalysisStatus.COMPLETED, analysisProgress: 100, analysisError: null,
    analyzedAt: now, analysisVersion: 'v1', analysisMethod: 'local', detectedFormat: 'WAV', codec: 'PCM',
    durationSeconds: 120, sampleRateHz: 48_000, channels: 2, bitrateBps: 128_000,
    estimatedBpm: 80, bpmConfidence: 0.8, estimatedKey: 'Lá menor', keyConfidence: 0.7,
    genreTags: ['MPB'], moodTags: ['calmo', 'noturno'], instrumentTags: ['violão'],
    createdAt: now, updatedAt: now, ...overrides,
  } as LibraryTrackEntity;
}

function setup(configured: boolean, tracks = [track()]) {
  const repository = { find: jest.fn().mockResolvedValue(tracks) } as unknown as jest.Mocked<Repository<LibraryTrackEntity>>;
  const dataSource = { query: jest.fn() } as unknown as jest.Mocked<DataSource>;
  const embeddings = {
    configured, model: '@cf/qwen/qwen3-embedding-0.6b', dimensions: 1_024,
    embed: jest.fn(),
  } as unknown as jest.Mocked<CloudflareEmbeddingsService>;
  const library = { toResponse: jest.fn((item) => ({ ...item })) } as unknown as jest.Mocked<LibraryService>;
  const queryCache = new QueryEmbeddingCacheService(embeddings);
  return { repository, dataSource, embeddings, service: new SemanticLibrarySearchService(repository, dataSource, embeddings, library, queryCache) };
}

describe('SemanticLibrarySearchService', () => {
  it('reuses the query across filters but refreshes changed track metadata', async () => {
    const item = track();
    const { service, dataSource, embeddings } = setup(true, [item]);
    embeddings.embed.mockResolvedValue([Array.from({ length: 1_024 }, () => 0.01)]);
    let stored: Array<{ track_id: string; text_hash: string; model: string }> = [];
    dataSource.query.mockImplementation(async (sql, parameters) => {
      if (sql.includes('SELECT "track_id", "text_hash"')) return stored;
      if (sql.includes('INSERT INTO "library_track_embeddings"')) {
        const values = parameters as unknown[];
        stored = [{ track_id: values[0] as string, model: values[1] as string, text_hash: values[3] as string }];
      }
      if (sql.includes('ORDER BY e."embedding"')) return [{ track_id: item.id, score: 0.82 }];
      return [];
    });
    await service.search('owner-id', { q: 'piano tranquilo' });
    expect(embeddings.embed).toHaveBeenCalledTimes(2);
    const second = await service.search('owner-id', { q: 'piano tranquilo', bpmMax: 100 });
    expect(second.mode).toBe('semantic');
    expect(embeddings.embed).toHaveBeenCalledTimes(2);
    item.notes = 'Nova descrição da faixa';
    const third = await service.search('owner-id', { q: 'piano tranquilo' });
    expect(third.results[0].notes).toBe(item.notes);
    expect(embeddings.embed).toHaveBeenCalledTimes(3);
  });

  it('uses metadata safely when Cloudflare is not configured', async () => {
    const { service, embeddings } = setup(false);
    const response = await service.search('owner-id', { q: 'música calma com violão' });
    expect(response.mode).toBe('metadata');
    expect(response.results).toHaveLength(1);
    expect(response.notice).toContain('Configure a Cloudflare');
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it('combines BPM and tag filters before ranking', async () => {
    const { service } = setup(false, [track(), track({ id: 'b-track', estimatedBpm: 160, instrumentTags: ['bateria'] })]);
    const response = await service.search('owner-id', { q: 'noturno', bpmMax: 100, instrument: 'violão' });
    expect(response.results.map((item) => item.id)).toEqual(['a3c99009-01a7-48d6-a2b1-7ea32f66dc1b']);
  });

  it('stores missing vectors and ranks similarity inside PostgreSQL', async () => {
    const { service, dataSource, embeddings } = setup(true);
    const vector = Array.from({ length: 1_024 }, () => 0.01);
    embeddings.embed.mockResolvedValueOnce([vector]).mockResolvedValueOnce([vector]);
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT "track_id", "text_hash"')) return [];
      if (sql.includes('ORDER BY e."embedding"')) return [{ track_id: track().id, score: 0.82 }];
      return [];
    });
    const response = await service.search('owner-id', { q: 'acústica e calma' });
    expect(response.mode).toBe('semantic');
    expect(response.results[0].matchScore).toBe(0.82);
    expect(embeddings.embed).toHaveBeenCalledTimes(2);
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "library_track_embeddings"'), expect.any(Array));
  });
});
