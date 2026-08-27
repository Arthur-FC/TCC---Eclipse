import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { MessageEntity } from './message.entity';

@Entity({ name: 'conversations' })
@Index('IDX_conversations_project_updated_at', ['projectId', 'updatedAt'])
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 120, default: 'Nova conversa' })
  title!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.conversations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'project_id',
    foreignKeyConstraintName: 'FK_conversations_project',
  })
  project!: ProjectEntity;

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages!: MessageEntity[];
}
