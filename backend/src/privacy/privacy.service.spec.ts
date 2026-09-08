import { ConfigService } from '@nestjs/config';
import { PrivacyService } from './privacy.service';

describe('PrivacyService', () => {
  function setup() {
    const users = { existsBy: jest.fn().mockResolvedValue(true) };
    const tracks = {
      findBy: jest.fn().mockResolvedValue([
        { id: 'track-1', ownerId: 'owner-1', objectKey: 'owner-1/track-1/source.mp3' },
      ]),
    };
    const storage = { deleteObject: jest.fn().mockResolvedValue(undefined) };
    const userDelete = jest.fn().mockResolvedValue(undefined);
    const dataSource = {
      query: jest.fn()
        .mockResolvedValueOnce([{ prompt: '120', completion: '45' }])
        .mockResolvedValueOnce([{ searches: '4', units: '500' }])
        .mockResolvedValueOnce([{ requests: '8', texts: '9' }])
        .mockResolvedValueOnce([{ requests: '3', reserved: '2700' }]),
      transaction: jest.fn(async (callback: (manager: unknown) => Promise<void>) => callback({
        getRepository: () => ({ delete: userDelete }),
      })),
    };
    const config = new ConfigService({
      AI_MAX_COMPLETION_TOKENS: 900,
      CLOUDFLARE_DAILY_REQUEST_LIMIT: 1_000,
      YOUTUBE_DAILY_SEARCH_LIMIT: 90,
      YOUTUBE_DAILY_GENERAL_LIMIT: 9_000,
    });
    const auth = { requireCurrentPassword: jest.fn().mockResolvedValue(undefined) };
    const library = { remove: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new PrivacyService(users as never, tracks as never, storage as never, dataSource as never, config, auth as never, library as never),
      storage,
      userDelete,
      auth,
    };
  }

  it('removes private objects before deleting the account', async () => {
    const { service, storage, userDelete, auth } = setup();
    await service.deleteAccount('owner-1', 'senha-atual');
    expect(auth.requireCurrentPassword).toHaveBeenCalledWith('owner-1', 'senha-atual');
    expect(storage.deleteObject).toHaveBeenCalledWith('owner-1/track-1/source.mp3');
    expect(userDelete).toHaveBeenCalledWith({ id: 'owner-1' });
    expect(storage.deleteObject.mock.invocationCallOrder[0]).toBeLessThan(
      userDelete.mock.invocationCallOrder[0],
    );
  });

  it('returns token consumption without exposing credentials', async () => {
    const { service } = setup();
    const usage = await service.usage('owner-1');
    expect(usage.groq).toMatchObject({ promptTokens: 120, completionTokens: 45, requests: 3, reservedCompletionTokens: 2700, perResponseLimit: 900 });
    expect(usage.youtube).toMatchObject({ searches: 4, units: 500, remainingSearches: 86, remainingUnits: 8_500 });
    expect(usage.cloudflare).toMatchObject({ requests: 8, texts: 9, remainingRequests: 992 });
    expect(usage.externalBillingAllowed).toBe(false);
    expect(JSON.stringify(usage)).not.toMatch(/apiKey|secret|credential/i);
  });
});
