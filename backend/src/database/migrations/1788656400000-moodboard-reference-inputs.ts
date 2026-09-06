import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoodboardReferenceInputs1788656400000 implements MigrationInterface {
  name = 'MoodboardReferenceInputs1788656400000';
  async up(q: QueryRunner): Promise<void> { await q.query("ALTER TABLE moodboards ADD reference_inputs jsonb NOT NULL DEFAULT '[]'::jsonb"); }
  async down(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE moodboards DROP COLUMN reference_inputs'); }
}
