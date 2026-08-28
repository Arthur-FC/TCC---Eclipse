import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConversationEntity } from '../projects/conversation.entity';
import { ProjectEntity } from '../projects/project.entity';
import { BriefingData } from './briefing-data';

export enum BriefingStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
}

@Entity({ name: 'briefings' })
@Index('UQ_briefings_project_version', ['projectId', 'version'], {
  unique: true,
})
@Index('IDX_briefings_project_created_at', ['projectId', 'createdAt'])
export class BriefingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'source_conversation_id', type: 'uuid', nullable: true })
  sourceConversationId!: string | null;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'varchar', length: 20, default: BriefingStatus.DRAFT })
  status!: BriefingStatus;

  @Column({ type: 'jsonb' })
  data!: BriefingData;

  @Column({ name: 'ai_provider', type: 'varchar', length: 30, nullable: true })
  aiProvider!: string | null;

  @Column({ name: 'ai_model', type: 'varchar', length: 120, nullable: true })
  aiModel!: string | null;

  @Column({ name: 'prompt_tokens', type: 'integer', nullable: true })
  promptTokens!: number | null;

  @Column({ name: 'completion_tokens', type: 'integer', nullable: true })
  completionTokens!: number | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'project_id',
    foreignKeyConstraintName: 'FK_briefings_project',
  })
  project!: ProjectEntity;

  @ManyToOne(() => ConversationEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'source_conversation_id',
    foreignKeyConstraintName: 'FK_briefings_source_conversation',
  })
  sourceConversation!: ConversationEntity | null;
}
