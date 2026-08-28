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

export enum AiToolExecutionStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

@Entity({ name: 'ai_tool_executions' })
@Index('IDX_ai_tool_executions_project_created_at', ['projectId', 'createdAt'])
export class AiToolExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'tool_call_id', type: 'varchar', length: 120 })
  toolCallId!: string;

  @Column({ name: 'tool_name', type: 'varchar', length: 80 })
  toolName!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: AiToolExecutionStatus;

  @Column({ name: 'duration_ms', type: 'integer' })
  durationMs!: number;

  @Column({ name: 'error_code', type: 'varchar', length: 60, nullable: true })
  errorCode!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'project_id',
    foreignKeyConstraintName: 'FK_ai_tool_executions_project',
  })
  project!: ProjectEntity;

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'conversation_id',
    foreignKeyConstraintName: 'FK_ai_tool_executions_conversation',
  })
  conversation!: ConversationEntity;
}
