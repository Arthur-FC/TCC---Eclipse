import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import { UserEntity } from '../users/user.entity';

@Entity({ name: 'evaluation_responses' })
@Index('UQ_evaluation_responses_owner_project', ['ownerId', 'projectId'], { unique: true })
@Check('CHK_evaluation_reference_relevance', '"reference_relevance" BETWEEN 1 AND 5')
@Check('CHK_evaluation_moodboard_utility', '"moodboard_utility" BETWEEN 1 AND 5')
@Check('CHK_evaluation_reuse_intent', '"reuse_intent" BETWEEN 1 AND 5')
export class EvaluationResponseEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'owner_id', type: 'uuid' }) ownerId!: string;
  @Column({ name: 'project_id', type: 'uuid' }) projectId!: string;
  @Column({ name: 'reference_relevance', type: 'smallint' }) referenceRelevance!: number;
  @Column({ name: 'moodboard_utility', type: 'smallint' }) moodboardUtility!: number;
  @Column({ name: 'reuse_intent', type: 'smallint' }) reuseIntent!: number;
  @Column({ type: 'varchar', length: 2_000, nullable: true }) comments!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'FK_evaluation_responses_owner' }) owner!: UserEntity;
  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id', foreignKeyConstraintName: 'FK_evaluation_responses_project' }) project!: ProjectEntity;
}
