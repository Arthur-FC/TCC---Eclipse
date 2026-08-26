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
