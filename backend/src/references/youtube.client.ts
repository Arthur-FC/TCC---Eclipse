import {
  BadGatewayException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import {
  YouTubeSearchCacheEntity,
  YouTubeVideoData,
} from './youtube-search-cache.entity';
import { YouTubeQuotaUsageEntity } from './youtube-quota-usage.entity';

interface YouTubeSearchResponse {
  items?: Array<{ id?: { videoId?: string } }>;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: { duration?: string };
    status?: {
      embeddable?: boolean;
      privacyStatus?: string;
      uploadStatus?: string;
    };
  }>;
}

interface YouTubeErrorResponse {
  error?: { errors?: Array<{ reason?: string }> };
}

export interface YouTubeSearchResult {
  query: string;
  fromCache: boolean;
  items: YouTubeVideoData[];
}

@Injectable()
export class YouTubeClient {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlSeconds: number;
  private readonly resultsLimit: number;
  private readonly dailySearchLimit: number;
  private readonly dailyGeneralLimit: number;

  constructor(
    configService: ConfigService,
    @InjectRepository(YouTubeSearchCacheEntity)
    private readonly cacheRepository: Repository<YouTubeSearchCacheEntity>,
    @InjectRepository(YouTubeQuotaUsageEntity)
    private readonly quotaRepository: Repository<YouTubeQuotaUsageEntity>,
  ) {
    this.apiKey = configService.get<string>('YOUTUBE_API_KEY', '').trim();
    this.timeoutMs = configService.get<number>('YOUTUBE_TIMEOUT_MS', 15_000);
    this.cacheTtlSeconds = configService.get<number>(
      'YOUTUBE_CACHE_TTL_SECONDS',
      86_400,
    );
    this.resultsLimit = configService.get<number>('YOUTUBE_RESULTS_LIMIT', 10);
    this.dailySearchLimit = configService.get<number>(
      'YOUTUBE_DAILY_SEARCH_LIMIT',
      90,
    );
    this.dailyGeneralLimit = configService.get<number>(
      'YOUTUBE_DAILY_GENERAL_LIMIT',
      9_000,
    );
  }

  async search(query: string, refresh = false): Promise<YouTubeSearchResult> {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const queryHash = createHash('sha256')
      .update(normalizedQuery.toLocaleLowerCase('pt-BR'))
      .digest('hex');

    if (!refresh) {
      const cached = await this.cacheRepository.findOneBy({ queryHash });
      if (cached && cached.expiresAt.getTime() > Date.now()) {
        if (cached.results.length > 0) {
          return { query: normalizedQuery, fromCache: true, items: cached.results };
        }

        // Um resultado vazio pode ter sido causado por uma resposta incompleta
        // da API e não deve bloquear novas tentativas durante todo o TTL.
        await this.cacheRepository.delete({ queryHash });
      }
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'A pesquisa do YouTube ainda não foi configurada no backend.',
      );
    }

    await this.reserveQuota('search');
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.search = new URLSearchParams({
      key: this.apiKey,
      part: 'snippet',
      type: 'video',
      q: normalizedQuery,
      maxResults: String(this.resultsLimit),
      videoCategoryId: '10',
      videoEmbeddable: 'true',
      safeSearch: 'moderate',
      relevanceLanguage: 'pt',
      regionCode: 'BR',
      fields: 'items(id/videoId)',
    }).toString();
    const searchResponse = await this.fetchJson<YouTubeSearchResponse>(searchUrl);
    const videoIds = [...new Set(
      (searchResponse.items ?? [])
        .map((item) => item.id?.videoId)
        .filter((id): id is string => !!id),
    )];

    let items: YouTubeVideoData[] = [];
    if (videoIds.length > 0) {
      await this.reserveQuota('general');
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      videosUrl.search = new URLSearchParams({
        key: this.apiKey,
        part: 'snippet,contentDetails,status',
        id: videoIds.join(','),
        fields:
          'items(id,snippet(title,channelTitle,thumbnails),contentDetails(duration),status(embeddable,privacyStatus,uploadStatus))',
      }).toString();
      const videosResponse = await this.fetchJson<YouTubeVideosResponse>(videosUrl);
      items = (videosResponse.items ?? [])
        .filter(
          (video) =>
            !!video.id &&
            video.status?.embeddable !== false &&
            video.status?.privacyStatus !== 'private' &&
            !['deleted', 'failed', 'rejected'].includes(
              video.status?.uploadStatus ?? '',
            ),
        )
        .map((video) => ({
          externalId: video.id!,
          title: this.decodeEntities(video.snippet?.title ?? 'Vídeo sem título'),
          creator: this.decodeEntities(
            video.snippet?.channelTitle ?? 'Canal desconhecido',
          ),
          thumbnailUrl: this.thumbnail(video.snippet?.thumbnails),
          url: `https://www.youtube.com/watch?v=${video.id}`,
          durationSeconds: this.parseDuration(
            video.contentDetails?.duration ?? '',
          ),
          embeddable: true,
        }));
    }

    if (items.length > 0) {
      await this.cacheRepository.upsert(
        {
          queryHash,
          query: normalizedQuery,
          results: items,
          expiresAt: new Date(Date.now() + this.cacheTtlSeconds * 1_000),
        },
        ['queryHash'],
      );
    } else {
      await this.cacheRepository.delete({ queryHash });
    }
    return { query: normalizedQuery, fromCache: false, items };
  }

  private async reserveQuota(kind: 'search' | 'general'): Promise<void> {
    const date = this.pacificDate();
    await this.quotaRepository.manager.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO "youtube_quota_usage" ("usage_date", "search_calls", "general_units")
         VALUES ($1, 0, 0) ON CONFLICT ("usage_date") DO NOTHING`,
        [date],
      );
      const column = kind === 'search' ? 'search_calls' : 'general_units';
      const limit = kind === 'search'
        ? this.dailySearchLimit
        : this.dailyGeneralLimit;
      const updated = (await manager.query(
        `UPDATE "youtube_quota_usage"
         SET "${column}" = "${column}" + 1, "updated_at" = now()
         WHERE "usage_date" = $1 AND "${column}" + 1 <= $2
         RETURNING "${column}"`,
        [date, limit],
      )) as unknown[];
      if (updated.length === 0) {
        throw new HttpException(
          kind === 'search'
            ? 'O limite diário de pesquisas no YouTube foi atingido.'
            : 'A quota diária do YouTube foi atingida.',
          429,
        );
      }
    });
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        let reason = '';
        try {
          const body = (await response.json()) as YouTubeErrorResponse;
          reason = body.error?.errors?.[0]?.reason ?? '';
        } catch {
          reason = '';
        }
        if (
          response.status === 429 ||
          ['quotaExceeded', 'dailyLimitExceeded'].includes(reason)
        ) {
          throw new HttpException(
            'A quota do YouTube foi atingida. Tente novamente após a renovação diária.',
            429,
          );
        }
        throw new BadGatewayException(
          'O YouTube recusou a pesquisa. Verifique a configuração da API.',
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (controller.signal.aborted) {
        throw new BadGatewayException(
          'O YouTube demorou demais para responder.',
        );
      }
      throw new BadGatewayException(
        'Não foi possível conectar à API do YouTube.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private pacificDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private thumbnail(
    thumbnails?: Record<string, { url?: string }>,
  ): string {
    return (
      thumbnails?.['high']?.url ??
      thumbnails?.['medium']?.url ??
      thumbnails?.['default']?.url ??
      ''
    );
  }

  private parseDuration(value: string): number | null {
    const match = value.match(
      /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/,
    );
    if (!match) return null;
    return (
      Number(match[1] ?? 0) * 86_400 +
      Number(match[2] ?? 0) * 3_600 +
      Number(match[3] ?? 0) * 60 +
      Number(match[4] ?? 0)
    );
  }

  private decodeEntities(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_match, code: string) =>
        String.fromCodePoint(Number(code)),
      );
  }
}
