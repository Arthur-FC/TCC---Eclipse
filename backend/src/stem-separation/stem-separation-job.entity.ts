import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StemSeparationEntity } from './stem-separation.entity';

@Entity({ name: 'stem_separation_jobs' })
export class StemSeparationJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'separation_id', type: 'uuid', unique: true }) separationId!: string;
  @Column({ type: 'varchar', length: 20, default: 'queued' }) status!: 'queued' | 'processing' | 'completed' | 'failed';
  @Column({ type: 'smallint', default: 0 }) attempts!: number;
  @Column({ name: 'available_at', type: 'timestamptz' }) availableAt!: Date;
  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true }) lockedAt!: Date | null;
  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true }) errorMessage!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @OneToOne(() => StemSeparationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'separation_id', foreignKeyConstraintName: 'FK_stem_separation_jobs_separation' })
  separation!: StemSeparationEntity;
}
