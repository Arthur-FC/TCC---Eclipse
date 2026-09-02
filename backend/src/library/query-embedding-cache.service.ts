import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { CloudflareEmbeddingsService } from './cloudflare-embeddings.service';

export const QUERY_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
export const QUERY_CACHE_MAX_ENTRIES = 256;

interface CachedVector {
  vector: number[];
  expiresAt: number;
}

export interface QueryEmbeddingResult {
  vector: number[];
  cache: 'hit' | 'miss' | 'shared';
}

@Injectable()
export class QueryEmbeddingCacheService {
  private readonly cache = new Map<string, CachedVector>();
  private readonly pending = new Map<string, Promise<number[]>>();

  constructor(private readonly embeddings: CloudflareEmbeddingsService) {}

  async get(ownerId: string, text: string): Promise<QueryEmbeddingResult> {
    const normalized = text.normalize('NFC').trim().replace(/\s+/g, ' ');
    const key = createHash('sha256').update(JSON.stringify([
      ownerId, this.embeddings.model, this.embeddings.dimensions, normalized,
    ])).digest('hex');
    const now = Date.now();
    for (const [entryKey, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(entryKey);
    }
    const cached = this.cache.get(key);
    if (cached) {
      // Move o item utilizado para o fim da ordem LRU.
      this.cache.delete(key);
      this.cache.set(key, cached);
      return { vector: [...cached.vector], cache: 'hit' };
    }
    const pending = this.pending.get(key);
    if (pending) return { vector: [...await pending], cache: 'shared' };

    const request = this.generate(key, normalized);
    // Limita também os registros de chamadas simultâneas mantidos em memória.
    const tracked = this.pending.size < QUERY_CACHE_MAX_ENTRIES;
    if (tracked) this.pending.set(key, request);
    try {
      return { vector: [...await request], cache: 'miss' };
    } finally {
      if (tracked) this.pending.delete(key);
    }
  }

  private async generate(key: string, text: string): Promise<number[]> {
    const [vector] = await this.embeddings.embed([text]);
    if (!vector || vector.length !== this.embeddings.dimensions ||
        !vector.every(Number.isFinite) || !vector.some((value) => value !== 0)) {
      throw new Error('Vetor de pesquisa inválido; resultado não armazenado em cache.');
    }
    this.cache.set(key, { vector: [...vector], expiresAt: Date.now() + QUERY_CACHE_TTL_MS });
    while (this.cache.size > QUERY_CACHE_MAX_ENTRIES) {
      this.cache.delete(this.cache.keys().next().value!);
    }
    return vector;
  }
}
