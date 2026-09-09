import { ConfigService } from '@nestjs/config';
import { CloudflareEmbeddingsService } from './cloudflare-embeddings.service';

describe('CloudflareEmbeddingsService quota', () => {
  it('stops before the external request when the daily quota is exhausted', async () => {
    const config = { get: jest.fn((key: string, fallback: unknown) => ({
      CLOUDFLARE_ACCOUNT_ID: 'account-test',
      CLOUDFLARE_API_TOKEN: 'token-test',
      CLOUDFLARE_DAILY_REQUEST_LIMIT: 1,
    } as Record<string, unknown>)[key] ?? fallback) } as unknown as ConfigService;
    const dataSource = { query: jest.fn().mockResolvedValue([]) };
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new CloudflareEmbeddingsService(config, dataSource as never);

    await expect(service.embed(['consulta'])).rejects.toThrow('limite diário');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
