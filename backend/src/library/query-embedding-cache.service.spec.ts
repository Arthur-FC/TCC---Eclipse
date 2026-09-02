import { CloudflareEmbeddingsService } from './cloudflare-embeddings.service';
import { QUERY_CACHE_MAX_ENTRIES, QUERY_CACHE_TTL_MS, QueryEmbeddingCacheService } from './query-embedding-cache.service';

function setup() {
  const embeddings = {
    model: 'model-a', dimensions: 3,
    embed: jest.fn().mockResolvedValue([[1, 0, 0]]),
  };
  return { embeddings, service: new QueryEmbeddingCacheService(embeddings as unknown as CloudflareEmbeddingsService) };
}

describe('QueryEmbeddingCacheService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reuses the vector with normalized spaces and returns independent copies', async () => {
    const { service, embeddings } = setup();
    const first = await service.get('owner-a', '  piano   tranquilo  ');
    first.vector[0] = 10;
    const second = await service.get('owner-a', 'piano tranquilo');
    expect(first.cache).toBe('miss');
    expect(second).toEqual({ cache: 'hit', vector: [1, 0, 0] });
    expect(embeddings.embed).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a different query, owner, model or dimension', async () => {
    const { service, embeddings } = setup();
    await service.get('owner-a', 'piano');
    await service.get('owner-a', 'guitarra');
    await service.get('owner-b', 'piano');
    embeddings.model = 'model-b';
    await service.get('owner-a', 'piano');
    embeddings.dimensions = 2;
    embeddings.embed.mockResolvedValue([[1, 0]]);
    await service.get('owner-a', 'piano');
    expect(embeddings.embed).toHaveBeenCalledTimes(5);
  });

  it('expires entries after 24 hours', async () => {
    const { service, embeddings } = setup();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await service.get('owner-a', 'piano');
    clock.mockReturnValue(1_000 + QUERY_CACHE_TTL_MS);
    expect((await service.get('owner-a', 'piano')).cache).toBe('miss');
    expect(embeddings.embed).toHaveBeenCalledTimes(2);
  });

  it('shares simultaneous calls for the same query', async () => {
    const { service, embeddings } = setup();
    let resolve!: (vectors: number[][]) => void;
    embeddings.embed.mockReturnValue(new Promise<number[][]>((done) => { resolve = done; }));
    const first = service.get('owner-a', 'piano');
    const second = service.get('owner-a', 'piano');
    resolve([[1, 0, 0]]);
    expect((await first).cache).toBe('miss');
    expect((await second).cache).toBe('shared');
    expect(embeddings.embed).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures and releases pending calls for retry', async () => {
    const { service, embeddings } = setup();
    embeddings.embed.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.get('owner-a', 'piano')).rejects.toThrow('timeout');
    expect((await service.get('owner-a', 'piano')).cache).toBe('miss');
    expect(embeddings.embed).toHaveBeenCalledTimes(2);
  });

  it.each([{ vector: [] }, { vector: [0, 0, 0] }, { vector: [NaN, 0, 0] }, { vector: [1, 0] }])('does not cache an invalid vector: $vector', async ({ vector }) => {
    const { service, embeddings } = setup();
    embeddings.embed.mockResolvedValueOnce([vector]);
    await expect(service.get('owner-a', 'piano')).rejects.toThrow('Vetor de pesquisa inválido');
    expect((await service.get('owner-a', 'piano')).cache).toBe('miss');
  });

  it('bounds cache size and evicts the least recently used entry', async () => {
    const { service } = setup();
    for (let index = 0; index < QUERY_CACHE_MAX_ENTRIES; index++) {
      await service.get('owner-a', `query-${index}`);
    }
    await service.get('owner-a', 'query-0');
    await service.get('owner-a', 'extra');
    expect((await service.get('owner-a', 'query-0')).cache).toBe('hit');
    expect((await service.get('owner-a', 'query-1')).cache).toBe('miss');
  });
});
