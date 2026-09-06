import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import { MoodboardData, MoodboardReferenceInput } from './moodboard-data';

@Entity({ name: 'moodboards' })
@Index('UQ_moodboards_project_version', ['projectId', 'version'], { unique: true })
export class MoodboardEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'project_id', type: 'uuid' }) projectId!: string;
  @Column({ type: 'integer' }) version!: number;
  @Column({ type: 'jsonb' }) data!: MoodboardData;
  @Column({ name: 'briefing_version', type: 'integer' }) briefingVersion!: number;
  @Column({ name: 'selection_hash', type: 'char', length: 64 }) selectionHash!: string;
  @Column({ name: 'reference_ids', type: 'uuid', array: true }) referenceIds!: string[];
  @Column({ name: 'reference_inputs', type: 'jsonb' }) referenceInputs!: MoodboardReferenceInput[];
  @Column({ name: 'ai_provider', type: 'varchar', length: 30 }) aiProvider!: string;
  @Column({ name: 'ai_model', type: 'varchar', length: 120 }) aiModel!: string;
  @Column({ name: 'prompt_tokens', type: 'integer', nullable: true }) promptTokens!: number | null;
  @Column({ name: 'completion_tokens', type: 'integer', nullable: true }) completionTokens!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id', foreignKeyConstraintName: 'FK_moodboards_project' }) project!: ProjectEntity;
}
