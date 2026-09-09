import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { StorageService } from '../library/storage.service';
import { UserEntity } from '../users/user.entity';
import { AuthService } from '../auth/auth.service';
import { LibraryService } from '../library/library.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface ProviderUsageResponse {
  period: string;
  groq: { promptTokens: number; completionTokens: number; requests: number; reservedCompletionTokens: number; perResponseLimit: number; dailyRequestLimit: number; dailyReservedCompletionTokenLimit: number };
  cloudflare: { requests: number; texts: number; dailyRequestLimit: number; remainingRequests: number };
  youtube: { searches: number; units: number; dailySearchLimit: number; dailyGeneralLimit: number; remainingSearches: number; remainingUnits: number };
  externalBillingAllowed: false;
}

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(LibraryTrackEntity) private readonly tracks: Repository<LibraryTrackEntity>,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly library: LibraryService,
  ) {}

  async usage(ownerId: string): Promise<ProviderUsageResponse> {
    const [groqResult, youtubeResult, cloudflareResult, groqDailyResult] = await Promise.all([
      this.dataSource.query<Array<{ prompt: string; completion: string }>>(`
      SELECT COALESCE(SUM(usage.prompt_tokens), 0) AS prompt,
             COALESCE(SUM(usage.completion_tokens), 0) AS completion
      FROM (
        SELECT m.prompt_tokens, m.completion_tokens, m.created_at
        FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN projects p ON p.id = c.project_id
        WHERE p.owner_id = $1
        UNION ALL
        SELECT b.prompt_tokens, b.completion_tokens, b.created_at
        FROM briefings b JOIN projects p ON p.id = b.project_id WHERE p.owner_id = $1
        UNION ALL
        SELECT mb.prompt_tokens, mb.completion_tokens, mb.created_at
        FROM moodboards mb JOIN projects p ON p.id = mb.project_id WHERE p.owner_id = $1
      ) usage WHERE usage.created_at >= CURRENT_DATE
      `, [ownerId]),
      this.dataSource.query<Array<{ searches: string; units: string }>>(`
        SELECT COALESCE(search_calls, 0) AS searches, COALESCE(general_units, 0) AS units
        FROM youtube_quota_usage WHERE usage_date = CURRENT_DATE
      `),
      this.dataSource.query<Array<{ requests: string; texts: string }>>(`
        SELECT COALESCE(request_count, 0) AS requests, COALESCE(text_count, 0) AS texts
        FROM embedding_usage_daily WHERE usage_date = CURRENT_DATE
      `),
      this.dataSource.query<Array<{ requests: string; reserved: string }>>(`
        SELECT COALESCE(request_count, 0) AS requests,
               COALESCE(reserved_completion_tokens, 0) AS reserved
        FROM groq_usage_daily WHERE usage_date = CURRENT_DATE
      `),
    ]);
    const groqRows = Array.isArray(groqResult[0]) ? groqResult[0] : groqResult;
    const youtubeRows = Array.isArray(youtubeResult[0]) ? youtubeResult[0] : youtubeResult;
    const cloudflareRows = Array.isArray(cloudflareResult[0]) ? cloudflareResult[0] : cloudflareResult;
    const groqDailyRows = Array.isArray(groqDailyResult[0]) ? groqDailyResult[0] : groqDailyResult;
    const searchLimit = this.config.get<number>('YOUTUBE_DAILY_SEARCH_LIMIT', 90);
    const unitLimit = this.config.get<number>('YOUTUBE_DAILY_GENERAL_LIMIT', 9_000);
    const cloudflareLimit = this.config.get<number>('CLOUDFLARE_DAILY_REQUEST_LIMIT', 1_000);
    const searches = Number(youtubeRows[0]?.searches ?? 0);
    const units = Number(youtubeRows[0]?.units ?? 0);
    const requests = Number(cloudflareRows[0]?.requests ?? 0);
    return {
      period: new Date().toISOString().slice(0, 10),
      groq: {
        promptTokens: Number(groqRows[0]?.prompt ?? 0),
        completionTokens: Number(groqRows[0]?.completion ?? 0),
        requests: Number(groqDailyRows[0]?.requests ?? 0),
        reservedCompletionTokens: Number(groqDailyRows[0]?.reserved ?? 0),
        perResponseLimit: this.config.get<number>('AI_MAX_COMPLETION_TOKENS', 900),
        dailyRequestLimit: this.config.get<number>('GROQ_DAILY_REQUEST_LIMIT', 500),
        dailyReservedCompletionTokenLimit: this.config.get<number>('GROQ_DAILY_RESERVED_COMPLETION_TOKENS', 100_000),
      },
      cloudflare: { requests, texts: Number(cloudflareRows[0]?.texts ?? 0), dailyRequestLimit: cloudflareLimit, remainingRequests: Math.max(0, cloudflareLimit - requests) },
      youtube: {
        searches, units, dailySearchLimit: searchLimit, dailyGeneralLimit: unitLimit,
        remainingSearches: Math.max(0, searchLimit - searches),
        remainingUnits: Math.max(0, unitLimit - units),
      },
      externalBillingAllowed: false,
    };
  }

  async exportData(ownerId: string): Promise<Record<string, unknown>> {
    const [profile, projects, conversations, messages, briefings, references, moodboards, library, evaluations] = await Promise.all([
      this.dataSource.query('SELECT id, name, email, status, created_at, updated_at FROM users WHERE id = $1', [ownerId]),
      this.dataSource.query('SELECT id, title, description, archived_at, created_at, updated_at FROM projects WHERE owner_id = $1 ORDER BY created_at', [ownerId]),
      this.dataSource.query('SELECT c.id, c.project_id, c.title, c.created_at, c.updated_at FROM conversations c JOIN projects p ON p.id = c.project_id WHERE p.owner_id = $1 ORDER BY c.created_at', [ownerId]),
      this.dataSource.query('SELECT m.id, m.conversation_id, m.role, m.content, m.created_at FROM messages m JOIN conversations c ON c.id = m.conversation_id JOIN projects p ON p.id = c.project_id WHERE p.owner_id = $1 ORDER BY m.created_at', [ownerId]),
      this.dataSource.query('SELECT b.id, b.project_id, b.version, b.status, b.data, b.confirmed_at, b.created_at FROM briefings b JOIN projects p ON p.id = b.project_id WHERE p.owner_id = $1 ORDER BY b.created_at', [ownerId]),
      this.dataSource.query('SELECT r.id, r.project_id, r.source, r.external_id, r.title, r.creator, r.url, r.status, r.created_at FROM music_references r JOIN projects p ON p.id = r.project_id WHERE p.owner_id = $1 ORDER BY r.created_at', [ownerId]),
      this.dataSource.query('SELECT m.id, m.project_id, m.version, m.data, m.reference_ids, m.created_at FROM moodboards m JOIN projects p ON p.id = m.project_id WHERE p.owner_id = $1 ORDER BY m.created_at', [ownerId]),
      this.dataSource.query('SELECT id, title, artist, notes, original_filename, content_type, size_bytes, status, processing_consent_at, processing_consent_version, uploaded_at, created_at, updated_at FROM library_tracks WHERE owner_id = $1 ORDER BY created_at', [ownerId]),
      this.dataSource.query('SELECT project_id, reference_relevance, moodboard_utility, reuse_intent, comments, created_at, updated_at FROM evaluation_responses WHERE owner_id = $1 ORDER BY created_at', [ownerId]),
    ]);
    return { exportedAt: new Date().toISOString(), profile: profile[0] ?? null, projects, conversations, messages, briefings, references, moodboards, library, evaluations };
  }

  async updateProfile(ownerId: string, dto: UpdateProfileDto): Promise<{ id: string; name: string; email: string; createdAt: Date }> {
    const user = await this.users.findOneBy({ id: ownerId });
    if (!user) throw new NotFoundException('Conta não encontrada.');
    user.name = dto.name.trim();
    user.email = dto.email.trim().toLowerCase();
    try {
      const saved = await this.users.save(user);
      return { id: saved.id, name: saved.name, email: saved.email, createdAt: saved.createdAt };
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }

  async revokeAudioConsent(ownerId: string, trackId: string): Promise<void> {
    await this.library.remove(ownerId, trackId);
  }

  async deleteAccount(ownerId: string, password: string): Promise<void> {
    await this.auth.requireCurrentPassword(ownerId, password);
    if (!(await this.users.existsBy({ id: ownerId }))) {
      throw new NotFoundException('Conta não encontrada.');
    }
    const tracks = await this.tracks.findBy({ ownerId });
    for (const track of tracks) {
      await this.storage.deleteObject(track.objectKey);
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UserEntity).delete({ id: ownerId });
    });
  }
}
