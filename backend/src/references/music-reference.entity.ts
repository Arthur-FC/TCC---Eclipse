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
