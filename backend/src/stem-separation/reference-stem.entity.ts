import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StemSeparationEntity } from './stem-separation.entity';
import { StemType } from './stem-separation-status.enum';

@Entity({ name: 'reference_stems' })
@Index('UQ_reference_stems_separation_type', ['separationId', 'type'], { unique: true })
export class ReferenceStemEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'separation_id', type: 'uuid' }) separationId!: string;
  @Column({ type: 'varchar', length: 20 }) type!: StemType;
  @Column({ name: 'object_key', type: 'varchar', length: 500, unique: true }) objectKey!: string;
  @Column({ name: 'content_type', type: 'varchar', length: 50, default: 'audio/wav' }) contentType!: string;
  @Column({ name: 'size_bytes', type: 'integer' }) sizeBytes!: number;

  @ManyToOne(() => StemSeparationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'separation_id', foreignKeyConstraintName: 'FK_reference_stems_separation' })
  separation!: StemSeparationEntity;
}
