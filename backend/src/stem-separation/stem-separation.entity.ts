import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MusicReferenceEntity } from '../references/music-reference.entity';
import { LibraryTrackEntity } from '../library/library-track.entity';
import { StemSeparationStatus } from './stem-separation-status.enum';

@Entity({ name: 'stem_separations' })
@Index('UQ_stem_separations_reference', ['referenceId'], { unique: true })
export class StemSeparationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'reference_id', type: 'uuid' }) referenceId!: string;
  @Column({ name: 'input_track_id', type: 'uuid' }) inputTrackId!: string;
  @Column({ type: 'varchar', length: 20, default: StemSeparationStatus.QUEUED }) status!: StemSeparationStatus;
  @Column({ type: 'smallint', default: 0 }) progress!: number;
  @Column({ name: 'model_name', type: 'varchar', length: 80 }) modelName!: string;
  @Column({ name: 'model_version', type: 'varchar', length: 80 }) modelVersion!: string;
  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true }) errorMessage!: string | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne(() => MusicReferenceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reference_id', foreignKeyConstraintName: 'FK_stem_separations_reference' })
  reference!: MusicReferenceEntity;

  @ManyToOne(() => LibraryTrackEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'input_track_id', foreignKeyConstraintName: 'FK_stem_separations_track' })
  inputTrack!: LibraryTrackEntity;
}
