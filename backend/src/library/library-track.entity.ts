import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { LibraryTrackStatus } from './library-track-status.enum';
import { AudioAnalysisStatus } from './audio-analysis-status.enum';

@Entity({ name: 'library_tracks' })
@Index('IDX_library_tracks_owner_updated_at', ['ownerId', 'updatedAt'])
export class LibraryTrackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  artist!: string | null;

  @Column({ type: 'varchar', length: 2_000, nullable: true })
  notes!: string | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 50 })
  contentType!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @Column({ name: 'object_key', type: 'varchar', length: 500, unique: true })
  objectKey!: string;

  @Column({ name: 'content_hash', type: 'char', length: 64, nullable: true })
  contentHash!: string | null;

  @Column({ type: 'varchar', length: 20, default: LibraryTrackStatus.PENDING })
  status!: LibraryTrackStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'upload_expires_at', type: 'timestamptz' })
  uploadExpiresAt!: Date;

  @Column({ name: 'uploaded_at', type: 'timestamptz', nullable: true })
  uploadedAt!: Date | null;

  @Column({
    name: 'analysis_status',
    type: 'varchar',
    length: 20,
    default: AudioAnalysisStatus.NONE,
  })
  analysisStatus!: AudioAnalysisStatus;

  @Column({ name: 'analysis_progress', type: 'smallint', default: 0 })
  analysisProgress!: number;

  @Column({ name: 'analysis_error', type: 'varchar', length: 500, nullable: true })
  analysisError!: string | null;

  @Column({ name: 'analyzed_at', type: 'timestamptz', nullable: true })
  analyzedAt!: Date | null;

  @Column({ name: 'analysis_version', type: 'varchar', length: 50, nullable: true })
  analysisVersion!: string | null;

  @Column({ name: 'analysis_method', type: 'varchar', length: 200, nullable: true })
  analysisMethod!: string | null;

  @Column({ name: 'detected_format', type: 'varchar', length: 50, nullable: true })
  detectedFormat!: string | null;

  @Column({ name: 'codec', type: 'varchar', length: 100, nullable: true })
  codec!: string | null;

  @Column({ name: 'duration_seconds', type: 'double precision', nullable: true })
  durationSeconds!: number | null;

  @Column({ name: 'sample_rate_hz', type: 'integer', nullable: true })
  sampleRateHz!: number | null;

  @Column({ type: 'smallint', nullable: true })
  channels!: number | null;

  @Column({ name: 'bitrate_bps', type: 'integer', nullable: true })
  bitrateBps!: number | null;

  @Column({ name: 'estimated_bpm', type: 'double precision', nullable: true })
  estimatedBpm!: number | null;

  @Column({ name: 'bpm_confidence', type: 'double precision', nullable: true })
  bpmConfidence!: number | null;

  @Column({ name: 'estimated_key', type: 'varchar', length: 20, nullable: true })
  estimatedKey!: string | null;

  @Column({ name: 'key_confidence', type: 'double precision', nullable: true })
  keyConfidence!: number | null;

  @Column({ name: 'genre_tags', type: 'text', array: true, default: () => "'{}'" })
  genreTags!: string[];

  @Column({ name: 'mood_tags', type: 'text', array: true, default: () => "'{}'" })
  moodTags!: string[];

  @Column({ name: 'instrument_tags', type: 'text', array: true, default: () => "'{}'" })
  instrumentTags!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_library_tracks_owner',
  })
  owner!: UserEntity;
}
