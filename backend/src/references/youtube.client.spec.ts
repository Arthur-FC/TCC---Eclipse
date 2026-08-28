import { ConfigService } from '@nestjs/config';
import { EntityManager, Repository } from 'typeorm';
import { YouTubeClient } from './youtube.client';
import { YouTubeQuotaUsageEntity } from './youtube-quota-usage.entity';
import { YouTubeSearchCacheEntity } from './youtube-search-cache.entity';

function config(apiKey = 'youtube-test-key'): ConfigService {
  const values: Record<string, string | number> = {
    YOUTUBE_API_KEY: apiKey,
    YOUTUBE_TIMEOUT_MS: 15_000,
    YOUTUBE_CACHE_TTL_SECONDS: 86_400,
    YOUTUBE_RESULTS_LIMIT: 10,
    YOUTUBE_DAILY_SEARCH_LIMIT: 90,
    YOUTUBE_DAILY_GENERAL_LIMIT: 9_000,
  };
  return {
    get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

function repositories(cached: YouTubeSearchCacheEntity | null = null) {
  const cacheRepository = {
    findOneBy: jest.fn().mockResolvedValue(cached),
    upsert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Repository<YouTubeSearchCacheEntity>>;
  const manager = {
    query: jest.fn(async (sql: string) =>
      sql.includes('RETURNING') ? [{ value: 1 }] : [],
    ),
  } as unknown as jest.Mocked<EntityManager>;
  const quotaRepository = {
    manager: {
      transaction: jest.fn(async (callback: (manager: EntityManager) => unknown) =>
        callback(manager),
      ),
    },
  } as unknown as jest.Mocked<Repository<YouTubeQuotaUsageEntity>>;
  return { cacheRepository, quotaRepository, manager };
}

describe('YouTubeClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('normalizes public embeddable videos and caches the result', async () => {
    const repos = repositories();
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              { id: { videoId: 'video-1' } },
              { id: { videoId: 'video-2' } },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: 'video-1',
                snippet: {
                  title: 'Sol &amp; Lua',
                  channelTitle: 'Canal Musical',
                  thumbnails: { high: { url: 'https://img.test/video-1.jpg' } },
                },
                contentDetails: { duration: 'PT3M15S' },
                status: {
                  embeddable: true,
                  privacyStatus: 'public',
                  uploadStatus: 'processed',
                },
              },
              {
                id: 'video-2',
                snippet: { title: 'Bloqueado', channelTitle: 'Canal' },
                contentDetails: { duration: 'PT2M' },
                status: {
                  embeddable: false,
                  privacyStatus: 'public',
                  uploadStatus: 'processed',
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const client = new YouTubeClient(
      config(),
      repos.cacheRepository,
      repos.quotaRepository,
    );

    const result = await client.search('  pop   noturno  ');

    expect(result).toMatchObject({
      query: 'pop noturno',
      fromCache: false,
      items: [
        {
          externalId: 'video-1',
          title: 'Sol & Lua',
          durationSeconds: 195,
          embeddable: true,
        },
      ],
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(repos.manager.query).toHaveBeenCalledTimes(4);
    expect(repos.cacheRepository.upsert).toHaveBeenCalled();
  });

  it('uses an unexpired cache without requiring an API key or quota', async () => {
    const cached = {
      queryHash: 'hash',
      query: 'pop noturno',
      results: [
        {
          externalId: 'cached-video',
          title: 'Cache',
          creator: 'Canal',
          thumbnailUrl: 'https://img.test/cache.jpg',
          url: 'https://www.youtube.com/watch?v=cached-video',
          durationSeconds: 120,
          embeddable: true,
        },
      ],
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    } as YouTubeSearchCacheEntity;
    const repos = repositories(cached);
    const client = new YouTubeClient(
      config(''),
      repos.cacheRepository,
      repos.quotaRepository,
    );

    const result = await client.search('pop noturno');

    expect(result.fromCache).toBe(true);
    expect(result.items[0].externalId).toBe('cached-video');
    expect(repos.quotaRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('removes an empty cache entry instead of reusing it', async () => {
    const cached = {
      queryHash: 'hash',
      query: 'pop noturno',
      results: [],
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    } as YouTubeSearchCacheEntity;
    const repos = repositories(cached);
    const client = new YouTubeClient(
      config(''),
      repos.cacheRepository,
      repos.quotaRepository,
    );

    await expect(client.search('pop noturno')).rejects.toThrow(
      'A pesquisa do YouTube ainda não foi configurada no backend.',
    );

    expect(repos.cacheRepository.delete).toHaveBeenCalled();
    expect(repos.quotaRepository.manager.transaction).not.toHaveBeenCalled();
  });
});
