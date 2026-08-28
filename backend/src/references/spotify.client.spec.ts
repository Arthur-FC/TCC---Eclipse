import { ConfigService } from '@nestjs/config';
import { SpotifyClient } from './spotify.client';

function config(clientId = 'client-id', clientSecret = 'client-secret') {
  const values: Record<string, string | number> = {
    SPOTIFY_CLIENT_ID: clientId,
    SPOTIFY_CLIENT_SECRET: clientSecret,
    SPOTIFY_MARKET: 'BR',
    SPOTIFY_TIMEOUT_MS: 15_000,
  };
  return {
    get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('SpotifyClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('authenticates, reads allowed metadata and reuses the access token', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'token', expires_in: 3600 }),
          { status: 200 },
        ),
      )
      .mockImplementation(async () =>
        new Response(
          JSON.stringify({
            id: '11dFghVXANMlKmJXsNCbNl',
            name: 'Canção Eclipse',
            duration_ms: 201_400,
            is_playable: true,
            artists: [{ name: 'Artista A' }, { name: 'Artista B' }],
            album: {
              name: 'Álbum Lunar',
              images: [
                { url: 'https://img.test/small.jpg', width: 64 },
                { url: 'https://img.test/large.jpg', width: 640 },
              ],
            },
            external_urls: {
              spotify:
                'https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl',
            },
            preview_url: 'https://audio.test/not-saved.mp3',
          }),
          { status: 200 },
        ),
      );
    const client = new SpotifyClient(config());

    const first = await client.getTrack('11dFghVXANMlKmJXsNCbNl');
    await client.getTrack('11dFghVXANMlKmJXsNCbNl');

    expect(first).toEqual({
      externalId: '11dFghVXANMlKmJXsNCbNl',
      title: 'Canção Eclipse',
      creator: 'Artista A, Artista B',
      album: 'Álbum Lunar',
      thumbnailUrl: 'https://img.test/large.jpg',
      url: 'https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl',
      durationSeconds: 201,
      embeddable: false,
    });
    expect(first).not.toHaveProperty('previewUrl');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails safely when credentials are missing', async () => {
    const client = new SpotifyClient(config('', ''));

    await expect(client.getTrack('11dFghVXANMlKmJXsNCbNl')).rejects.toThrow(
      'A integração do Spotify ainda não foi configurada no backend.',
    );
  });
});
