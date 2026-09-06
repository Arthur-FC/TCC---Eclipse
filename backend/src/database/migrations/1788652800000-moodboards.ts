import { MigrationInterface, QueryRunner } from 'typeorm';

export class Moodboards1788652800000 implements MigrationInterface {
  name = 'Moodboards1788652800000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE moodboards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version integer NOT NULL CHECK(version > 0),
      data jsonb NOT NULL,
      briefing_version integer NOT NULL,
      selection_hash char(64) NOT NULL,
      reference_ids uuid[] NOT NULL,
      ai_provider varchar(30) NOT NULL,
      ai_model varchar(120) NOT NULL,
      prompt_tokens integer,
      completion_tokens integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_moodboards_project_version" UNIQUE(project_id, version)
    )`);
    await q.query('CREATE INDEX "IDX_moodboards_project_created_at" ON moodboards(project_id, created_at DESC)');
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE moodboards'); }
}
