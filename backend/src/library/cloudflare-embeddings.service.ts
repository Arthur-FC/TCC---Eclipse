import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

interface CloudflareResponse {
  success?: boolean;
  result?: { data?: number[][]; shape?: number[] };
  errors?: Array<{ message?: string }>;
}

export class EmbeddingsUnavailableError extends Error {}

@Injectable()
export class CloudflareEmbeddingsService {
  private readonly logger = new Logger(CloudflareEmbeddingsService.name);
  readonly model: string;
  readonly dimensions: number;
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;
  private readonly dailyLimit: number;

  constructor(config: ConfigService, private readonly dataSource: DataSource) {
    this.accountId = config.get<string>('CLOUDFLARE_ACCOUNT_ID', '').trim();
    this.apiToken = config.get<string>('CLOUDFLARE_API_TOKEN', '').trim();
    this.model = config.get<string>('CLOUDFLARE_EMBEDDING_MODEL', '@cf/qwen/qwen3-embedding-0.6b');
    this.dimensions = config.get<number>('CLOUDFLARE_EMBEDDING_DIMENSIONS', 1_024);
    this.timeoutMs = config.get<number>('CLOUDFLARE_TIMEOUT_MS', 15_000);
    this.dailyLimit = config.get<number>('CLOUDFLARE_DAILY_REQUEST_LIMIT', 1_000);
  }

  get configured(): boolean {
    return Boolean(this.accountId && this.apiToken);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.configured) throw new EmbeddingsUnavailableError('Cloudflare Workers AI ainda não foi configurada.');
    if (!texts.length) return [];
    await this.reserveDailyRequest(texts.length);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = performance.now();
    let succeeded = false;
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/ai/run/${this.model}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: texts }),
          signal: controller.signal,
        },
      );
      const body = (await response.json()) as CloudflareResponse;
      const vectors = body.result?.data;
      if (!response.ok || body.success === false || !vectors) {
        throw new EmbeddingsUnavailableError(body.errors?.[0]?.message || `Cloudflare respondeu com HTTP ${response.status}.`);
      }
      if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== this.dimensions)) {
        throw new EmbeddingsUnavailableError('A Cloudflare retornou vetores com dimensão inesperada.');
      }
      succeeded = true;
      return vectors;
    } catch (error) {
      if (error instanceof EmbeddingsUnavailableError) throw error;
      throw new EmbeddingsUnavailableError(error instanceof Error && error.name === 'AbortError'
        ? 'A geração dos vetores excedeu o tempo limite.'
        : 'Não foi possível acessar a Cloudflare Workers AI.');
    } finally {
      clearTimeout(timeout);
      this.logger.log(JSON.stringify({
        event: 'cloudflare-embedding', texts: texts.length, succeeded,
        cloudflareMs: Math.round(performance.now() - startedAt),
      }));
    }
  }

  private async reserveDailyRequest(textCount: number): Promise<void> {
    const result = await this.dataSource.query(`
      INSERT INTO "embedding_usage_daily" ("usage_date", "request_count", "text_count")
      VALUES (CURRENT_DATE, 1, $1)
      ON CONFLICT ("usage_date") DO UPDATE
      SET "request_count" = "embedding_usage_daily"."request_count" + 1,
          "text_count" = "embedding_usage_daily"."text_count" + EXCLUDED."text_count",
          "updated_at" = now()
      WHERE "embedding_usage_daily"."request_count" < $2
      RETURNING "request_count"
    `, [textCount, this.dailyLimit]);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    if (!rows?.length) throw new EmbeddingsUnavailableError('O limite diário configurado para embeddings foi atingido.');
  }
}
