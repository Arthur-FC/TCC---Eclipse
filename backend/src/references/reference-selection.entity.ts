import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';

@Entity({ name: 'reference_selections' })
export class ReferenceSelectionEntity {
  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'reference_ids', type: 'uuid', array: true })
  referenceIds!: string[];

  @Column({ name: 'snapshot_hash', type: 'char', length: 64 })
  snapshotHash!: string;

  @Column({ name: 'briefing_version', type: 'integer' })
  briefingVersion!: number;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id', foreignKeyConstraintName: 'FK_reference_selections_project' })
  project!: ProjectEntity;
}
