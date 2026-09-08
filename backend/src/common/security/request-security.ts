import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';

interface WindowEntry { count: number; resetAt: number; }

export interface RateLimitStore {
  increment(key: string, windowStart: Date, windowMs: number): Promise<number>;
}

export class PostgresRateLimitStore implements RateLimitStore {
  private lastCleanupAt = 0;

  constructor(private readonly dataSource: DataSource) {}

  async increment(key: string, windowStart: Date, windowMs: number): Promise<number> {
    const result = await this.dataSource.query<Array<{ request_count: number | string }>>(`
      INSERT INTO request_rate_limits (bucket_key, window_start, request_count, expires_at)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (bucket_key, window_start)
      DO UPDATE SET request_count = request_rate_limits.request_count + 1
      RETURNING request_count
    `, [key, windowStart, new Date(windowStart.getTime() + windowMs)]);
    const rows = Array.isArray(result[0]) ? result[0] : result;
    const now = Date.now();
    if (now - this.lastCleanupAt > 3_600_000) {
      this.lastCleanupAt = now;
      void this.dataSource.query('DELETE FROM request_rate_limits WHERE expires_at < NOW()').catch(() => undefined);
    }
    return Number(rows[0]?.request_count ?? 1);
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, WindowEntry>();

  async increment(key: string, windowStart: Date, windowMs: number): Promise<number> {
    const now = windowStart.getTime();
    const current = this.buckets.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    entry.count += 1;
    this.buckets.set(key, entry);
    return entry.count;
  }
}

export function createRequestSecurityMiddleware(
  config: ConfigService,
  store: RateLimitStore = new MemoryRateLimitStore(),
) {
  const allowedOrigins = new Set(
    config.get<string>('CORS_ORIGINS', 'http://localhost:4200')
      .split(',').map((origin) => origin.trim()).filter(Boolean),
  );
  const limits = {
    general: config.get<number>('RATE_LIMIT_PER_MINUTE', 300),
    auth: config.get<number>('AUTH_RATE_LIMIT_PER_MINUTE', 60),
    ai: config.get<number>('AI_RATE_LIMIT_PER_MINUTE', 60),
    upload: config.get<number>('UPLOAD_RATE_LIMIT_PER_HOUR', 30),
  };

  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    if (!safeOrigin(request, allowedOrigins)) {
      response.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Origem da requisição não autorizada.',
        path: request.path,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (request.method === 'OPTIONS' || request.path.endsWith('/health')) {
      next();
      return;
    }

    const category = requestCategory(request.path);
    const windowMs = category === 'upload' ? 3_600_000 : 60_000;
    const limit = limits[category];
    const now = Date.now();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const clientHash = createHash('sha256').update(ip).digest('hex');
    const key = `${category}:${clientHash}`;
    const windowStartMs = Math.floor(now / windowMs) * windowMs;
    const resetAt = windowStartMs + windowMs;
    const count = await store.increment(key, new Date(windowStartMs), windowMs);

    response.setHeader('X-RateLimit-Limit', String(limit));
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    response.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1_000)));
    if (count > limit) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((resetAt - now) / 1_000))));
      response.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Muitas requisições. Aguarde antes de tentar novamente.',
        path: request.path,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}

function safeOrigin(request: Request, allowedOrigins: Set<string>): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.get('origin');
  if (origin) return allowedOrigins.has(origin);
  return request.get('sec-fetch-site') !== 'cross-site';
}

function requestCategory(path: string): 'general' | 'auth' | 'ai' | 'upload' {
  if (/\/auth\/(login|register)$/.test(path)) return 'auth';
  if (/\/uploads$/.test(path)) return 'upload';
  if (/\/(assistant\/stream|briefings\/generate|moodboards\/generate|references\/(curation|youtube\/search))$/.test(path)) return 'ai';
  return 'general';
}
