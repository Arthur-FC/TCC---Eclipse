import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LibraryTrackEntity } from './library-track.entity';

export type AudioAnalysisJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

@Entity({ name: 'audio_analysis_jobs' })
export class AudioAnalysisJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'track_id', type: 'uuid', unique: true })
  trackId!: string;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status!: AudioAnalysisJobStatus;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'available_at', type: 'timestamptz' })
  availableAt!: Date;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => LibraryTrackEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'track_id',
    foreignKeyConstraintName: 'FK_audio_analysis_jobs_track',
  })
  track!: LibraryTrackEntity;
}
