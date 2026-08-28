import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'youtube_quota_usage' })
export class YouTubeQuotaUsageEntity {
  @PrimaryColumn({ name: 'usage_date', type: 'date' })
  usageDate!: string;

  @Column({ name: 'search_calls', type: 'integer', default: 0 })
  searchCalls!: number;

  @Column({ name: 'general_units', type: 'integer', default: 0 })
  generalUnits!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
