import { MigrationInterface, QueryRunner } from 'typeorm';

export class YoutubeReferences1788048000000 implements MigrationInterface {
  name = 'YoutubeReferences1788048000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "music_references" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "source" varchar(20) NOT NULL,
        "external_id" varchar(120) NOT NULL,
        "title" varchar(300) NOT NULL,
        "creator" varchar(200) NOT NULL,
        "thumbnail_url" varchar(1000) NOT NULL,
        "url" varchar(1000) NOT NULL,
        "duration_seconds" integer,
        "embeddable" boolean NOT NULL DEFAULT true,
        "search_query" varchar(300) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_music_references" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_music_references_project_source_external" UNIQUE ("project_id", "source", "external_id"),
        CONSTRAINT "CHK_music_references_source" CHECK ("source" IN ('youtube')),
        CONSTRAINT "CHK_music_references_status" CHECK ("status" IN ('pending', 'approved', 'rejected')),
        CONSTRAINT "CHK_music_references_duration" CHECK ("duration_seconds" IS NULL OR "duration_seconds" >= 0),
        CONSTRAINT "FK_music_references_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_music_references_project_status" ON "music_references" ("project_id", "status")',
    );
    await queryRunner.query(`
      CREATE TABLE "youtube_search_cache" (
        "query_hash" char(64) NOT NULL,
        "query" varchar(300) NOT NULL,
        "results" jsonb NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_youtube_search_cache" PRIMARY KEY ("query_hash")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "youtube_quota_usage" (
        "usage_date" date NOT NULL,
        "search_calls" integer NOT NULL DEFAULT 0,
        "general_units" integer NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_youtube_quota_usage" PRIMARY KEY ("usage_date"),
        CONSTRAINT "CHK_youtube_quota_search" CHECK ("search_calls" >= 0),
        CONSTRAINT "CHK_youtube_quota_general" CHECK ("general_units" >= 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "youtube_quota_usage"');
    await queryRunner.query('DROP TABLE "youtube_search_cache"');
    await queryRunner.query('DROP INDEX "IDX_music_references_project_status"');
    await queryRunner.query('DROP TABLE "music_references"');
  }
}
