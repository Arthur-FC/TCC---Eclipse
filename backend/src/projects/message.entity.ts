import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import { MessageRole } from './message-role.enum';

@Entity({ name: 'messages' })
@Index('IDX_messages_conversation_created_at', ['conversationId', 'createdAt'])
@Check('CHK_messages_role', `"role" IN ('user', 'assistant')`)
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'ai_provider', type: 'varchar', length: 30, nullable: true })
  aiProvider!: string | null;

  @Column({ name: 'ai_model', type: 'varchar', length: 120, nullable: true })
  aiModel!: string | null;

  @Column({ name: 'prompt_tokens', type: 'integer', nullable: true })
  promptTokens!: number | null;

  @Column({ name: 'completion_tokens', type: 'integer', nullable: true })
  completionTokens!: number | null;

  @Column({ name: 'ai_latency_ms', type: 'integer', nullable: true })
  aiLatencyMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(
    () => ConversationEntity,
    (conversation) => conversation.messages,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({
    name: 'conversation_id',
    foreignKeyConstraintName: 'FK_messages_conversation',
  })
  conversation!: ConversationEntity;
}
