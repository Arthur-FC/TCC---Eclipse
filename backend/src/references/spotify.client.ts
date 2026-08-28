import {
  BadGatewayException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SpotifyTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface SpotifyTrackResponse {
  id?: string;
  name?: string;
  duration_ms?: number;
  is_playable?: boolean;
  restrictions?: { reason?: string };
  artists?: Array<{ name?: string }>;
  album?: {
    name?: string;
    images?: Array<{ url?: string; width?: number; height?: number }>;
  };
  external_urls?: { spotify?: string };
}

export interface SpotifyTrackData {
  externalId: string;
  title: string;
  creator: string;
  album: string;
  thumbnailUrl: string;
  url: string;
  durationSeconds: number;
  embeddable: false;
}

@Injectable()
export class SpotifyClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly timeoutMs: number;
  private readonly market: string;
  private accessToken = '';
  private accessTokenExpiresAt = 0;

  constructor(configService: ConfigService) {
    this.clientId = configService.get<string>('SPOTIFY_CLIENT_ID', '').trim();
    this.clientSecret = configService
      .get<string>('SPOTIFY_CLIENT_SECRET', '')
      .trim();
    this.timeoutMs = configService.get<number>('SPOTIFY_TIMEOUT_MS', 15_000);
    this.market = configService.get<string>('SPOTIFY_MARKET', 'BR').trim();
  }

  async getTrack(trackId: string): Promise<SpotifyTrackData> {
    this.ensureConfigured();
    let token = await this.getAccessToken();
    let response = await this.fetchTrack(trackId, token);
    if (response.status === 401) {
      this.accessToken = '';
      this.accessTokenExpiresAt = 0;
      token = await this.getAccessToken();
      response = await this.fetchTrack(trackId, token);
    }

    if (response.status === 404) {
      throw new NotFoundException(
        'A faixa não foi encontrada ou não está disponível no Spotify.',
      );
    }
    if (response.status === 429) {
      throw new HttpException(
        'O limite de consultas do Spotify foi atingido. Tente novamente mais tarde.',
        429,
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        'O Spotify recusou a consulta. Verifique as credenciais do aplicativo.',
      );
    }

    const track = (await response.json()) as SpotifyTrackResponse;
    if (
      !track.id ||
      !track.name ||
      track.is_playable === false ||
      track.restrictions
    ) {
      throw new NotFoundException(
        `A faixa não está disponível no mercado ${this.market}.`,
      );
    }

    const artists = (track.artists ?? [])
      .map((artist) => artist.name?.trim())
      .filter((name): name is string => !!name);
    const image = [...(track.album?.images ?? [])]
      .filter((item) => !!item.url)
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url;

    return {
      externalId: track.id,
      title: track.name.slice(0, 300),
      creator: (artists.join(', ') || 'Artista não informado').slice(0, 200),
      album: (track.album?.name?.trim() || 'Álbum não informado').slice(0, 300),
      thumbnailUrl: (image ?? '').slice(0, 1_000),
      url:
        track.external_urls?.spotify ??
        `https://open.spotify.com/track/${track.id}`,
      durationSeconds: Math.max(0, Math.round((track.duration_ms ?? 0) / 1_000)),
      embeddable: false,
    };
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'A integração do Spotify ainda não foi configurada no backend.',
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessTokenExpiresAt > Date.now() + 60_000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const response = await this.fetchWithTimeout(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      },
    );
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Não foi possível autenticar o aplicativo no Spotify.',
      );
    }

    const token = (await response.json()) as SpotifyTokenResponse;
    if (!token.access_token || !token.expires_in) {
      throw new BadGatewayException(
        'O Spotify devolveu uma autenticação inválida.',
      );
    }
    this.accessToken = token.access_token;
    this.accessTokenExpiresAt = Date.now() + token.expires_in * 1_000;
    return this.accessToken;
  }

  private fetchTrack(trackId: string, token: string): Promise<Response> {
    const url = new URL(`https://api.spotify.com/v1/tracks/${trackId}`);
    url.searchParams.set('market', this.market);
    return this.fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  private async fetchWithTimeout(
    input: string | URL,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch {
      if (controller.signal.aborted) {
        throw new BadGatewayException(
          'O Spotify demorou demais para responder.',
        );
      }
      throw new BadGatewayException(
        'Não foi possível conectar à API do Spotify.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
