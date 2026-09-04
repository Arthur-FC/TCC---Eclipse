import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReferenceCuration1788566400000 implements MigrationInterface {
  name = 'ReferenceCuration1788566400000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE music_references
      DROP CONSTRAINT "CHK_music_references_source",
      ADD CONSTRAINT "CHK_music_references_source" CHECK (source IN ('youtube','spotify','library','manual')),
      ADD library_track_id uuid REFERENCES library_tracks(id) ON DELETE SET NULL,
      ADD description varchar(2000) NOT NULL DEFAULT '',
      ADD score double precision,
      ADD justification varchar(3000),
      ADD ranking_method varchar(50),
      ADD justification_model varchar(120),
      ADD duplicate_of_id uuid REFERENCES music_references(id) ON DELETE SET NULL,
      ADD curated_briefing_version integer,
      ADD CONSTRAINT "CHK_reference_score" CHECK (score IS NULL OR (score >= 0 AND score <= 1))`);
    await q.query(`CREATE TABLE reference_selections (
      project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      reference_ids uuid[] NOT NULL,
      snapshot_hash char(64) NOT NULL,
      briefing_version integer NOT NULL,
      confirmed_at timestamptz
    )`);
    await q.query(`CREATE TABLE reference_embeddings (
      reference_id uuid PRIMARY KEY REFERENCES music_references(id) ON DELETE CASCADE,
      model varchar(120) NOT NULL,
      text_hash char(64) NOT NULL,
      embedding vector(1024) NOT NULL
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE reference_embeddings');
    await q.query('DROP TABLE reference_selections');
    await q.query(`ALTER TABLE music_references DROP CONSTRAINT "CHK_reference_score",
      DROP COLUMN curated_briefing_version, DROP COLUMN duplicate_of_id,
      DROP COLUMN justification_model, DROP COLUMN ranking_method, DROP COLUMN justification,
      DROP COLUMN score, DROP COLUMN description, DROP COLUMN library_track_id`);
    // Não exclui referências criadas pelo usuário para restaurar um CHECK antigo.
  }
}
