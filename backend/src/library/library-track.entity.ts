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
import { UserEntity } from '../users/user.entity';
import { LibraryTrackStatus } from './library-track-status.enum';

@Entity({ name: 'library_tracks' })
@Index('IDX_library_tracks_owner_updated_at', ['ownerId', 'updatedAt'])
export class LibraryTrackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  artist!: string | null;

  @Column({ type: 'varchar', length: 2_000, nullable: true })
  notes!: string | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 50 })
  contentType!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @Column({ name: 'object_key', type: 'varchar', length: 500, unique: true })
  objectKey!: string;

  @Column({ name: 'content_hash', type: 'char', length: 64, nullable: true })
  contentHash!: string | null;

  @Column({ type: 'varchar', length: 20, default: LibraryTrackStatus.PENDING })
  status!: LibraryTrackStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'upload_expires_at', type: 'timestamptz' })
  uploadExpiresAt!: Date;

  @Column({ name: 'uploaded_at', type: 'timestamptz', nullable: true })
  uploadedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_library_tracks_owner',
  })
  owner!: UserEntity;
}
