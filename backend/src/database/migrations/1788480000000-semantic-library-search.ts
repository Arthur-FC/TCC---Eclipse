import { MigrationInterface, QueryRunner } from 'typeorm';

export class SemanticLibrarySearch1788480000000 implements MigrationInterface {
  name = 'SemanticLibrarySearch1788480000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
    await queryRunner.query(`
      CREATE TABLE "library_track_embeddings" (
        "track_id" uuid NOT NULL,
        "model" varchar(120) NOT NULL,
        "dimensions" smallint NOT NULL,
        "text_hash" char(64) NOT NULL,
        "embedding" vector(1024) NOT NULL,
        "embedded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_library_track_embeddings" PRIMARY KEY ("track_id"),
        CONSTRAINT "FK_library_track_embeddings_track" FOREIGN KEY ("track_id")
          REFERENCES "library_tracks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "embedding_usage_daily" (
        "usage_date" date NOT NULL,
        "request_count" integer NOT NULL DEFAULT 0,
        "text_count" integer NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_embedding_usage_daily" PRIMARY KEY ("usage_date")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "embedding_usage_daily"');
    await queryRunner.query('DROP TABLE "library_track_embeddings"');
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}
