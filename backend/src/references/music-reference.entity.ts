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
import { ProjectEntity } from '../projects/project.entity';
import { ReferenceSource, ReferenceStatus } from './reference-status.enum';
import { LibraryTrackEntity } from '../library/library-track.entity';

@Entity({ name: 'music_references' })
@Index(
  'UQ_music_references_project_source_external',
  ['projectId', 'source', 'externalId'],
  { unique: true },
)
@Index('IDX_music_references_project_status', ['projectId', 'status'])
export class MusicReferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 20 })
  source!: ReferenceSource;

  @Column({ name: 'external_id', type: 'varchar', length: 120 })
  externalId!: string;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'varchar', length: 200 })
  creator!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  album!: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 1000 })
  thumbnailUrl!: string;

  @Column({ type: 'varchar', length: 1000 })
  url!: string;

  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds!: number | null;

  @Column({ type: 'boolean', default: true })
  embeddable!: boolean;

  @Column({ name: 'search_query', type: 'varchar', length: 300 })
  searchQuery!: string;

  @Column({ type: 'varchar', length: 20, default: ReferenceStatus.PENDING })
  status!: ReferenceStatus;

  @Column({ name: 'library_track_id', type: 'uuid', nullable: true })
  libraryTrackId!: string | null;

  @ManyToOne(() => LibraryTrackEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'library_track_id', foreignKeyConstraintName: 'FK_music_references_library_track' })
  libraryTrack!: LibraryTrackEntity | null;

  @Column({ type: 'varchar', length: 2000, default: '' })
  description!: string;

  @Column({ type: 'double precision', nullable: true })
  score!: number | null;

  @Column({ type: 'varchar', length: 3000, nullable: true })
  justification!: string | null;

  @Column({ name: 'ranking_method', type: 'varchar', length: 50, nullable: true })
  rankingMethod!: string | null;

  @Column({ name: 'justification_model', type: 'varchar', length: 120, nullable: true })
  justificationModel!: string | null;

  @Column({ name: 'duplicate_of_id', type: 'uuid', nullable: true })
  duplicateOfId!: string | null;

  @Column({ name: 'curated_briefing_version', type: 'integer', nullable: true })
  curatedBriefingVersion!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'project_id',
    foreignKeyConstraintName: 'FK_music_references_project',
  })
  project!: ProjectEntity;
}
