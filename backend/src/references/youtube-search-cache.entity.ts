import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export interface YouTubeVideoData {
  externalId: string;
  title: string;
  creator: string;
  thumbnailUrl: string;
  url: string;
  durationSeconds: number | null;
  embeddable: boolean;
}

@Entity({ name: 'youtube_search_cache' })
export class YouTubeSearchCacheEntity {
  @PrimaryColumn({ name: 'query_hash', type: 'char', length: 64 })
  queryHash!: string;

  @Column({ type: 'varchar', length: 300 })
  query!: string;

  @Column({ type: 'jsonb' })
  results!: YouTubeVideoData[];

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
