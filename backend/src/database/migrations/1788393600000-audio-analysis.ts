import { MigrationInterface, QueryRunner } from 'typeorm';

export class AudioAnalysis1788393600000 implements MigrationInterface {
  name = 'AudioAnalysis1788393600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
        ADD "analysis_status" varchar(20) NOT NULL DEFAULT 'none',
        ADD "analysis_progress" smallint NOT NULL DEFAULT 0,
        ADD "analysis_error" varchar(500),
        ADD "analyzed_at" timestamptz,
        ADD "analysis_version" varchar(50),
        ADD "analysis_method" varchar(200),
        ADD "detected_format" varchar(50),
        ADD "codec" varchar(100),
        ADD "duration_seconds" double precision,
        ADD "sample_rate_hz" integer,
        ADD "channels" smallint,
        ADD "bitrate_bps" integer,
        ADD "estimated_bpm" double precision,
        ADD "bpm_confidence" double precision,
        ADD "estimated_key" varchar(20),
        ADD "key_confidence" double precision,
        ADD "genre_tags" text[] NOT NULL DEFAULT '{}',
        ADD "mood_tags" text[] NOT NULL DEFAULT '{}',
        ADD "instrument_tags" text[] NOT NULL DEFAULT '{}',
        ADD CONSTRAINT "CHK_library_tracks_analysis_status"
          CHECK ("analysis_status" IN ('none', 'queued', 'processing', 'completed', 'failed')),
        ADD CONSTRAINT "CHK_library_tracks_analysis_progress"
          CHECK ("analysis_progress" BETWEEN 0 AND 100)
    `);
    await queryRunner.query(`
      CREATE TABLE "audio_analysis_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "track_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'queued',
        "attempts" integer NOT NULL DEFAULT 0,
        "available_at" timestamptz NOT NULL DEFAULT now(),
        "locked_at" timestamptz,
        "error_message" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audio_analysis_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_audio_analysis_jobs_track" UNIQUE ("track_id"),
        CONSTRAINT "CHK_audio_analysis_jobs_status"
          CHECK ("status" IN ('queued', 'processing', 'completed', 'failed')),
        CONSTRAINT "FK_audio_analysis_jobs_track" FOREIGN KEY ("track_id")
          REFERENCES "library_tracks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audio_analysis_jobs_queue"
      ON "audio_analysis_jobs" ("status", "available_at", "created_at")
    `);
    await queryRunner.query(`
      UPDATE "library_tracks"
      SET "analysis_status" = 'queued'
      WHERE "status" = 'ready'
    `);
    await queryRunner.query(`
      INSERT INTO "audio_analysis_jobs" ("track_id", "status", "available_at")
      SELECT "id", 'queued', now()
      FROM "library_tracks"
      WHERE "status" = 'ready'
      ON CONFLICT ("track_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "audio_analysis_jobs"');
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
        DROP CONSTRAINT "CHK_library_tracks_analysis_progress",
        DROP CONSTRAINT "CHK_library_tracks_analysis_status",
        DROP COLUMN "instrument_tags",
        DROP COLUMN "mood_tags",
        DROP COLUMN "genre_tags",
        DROP COLUMN "key_confidence",
        DROP COLUMN "estimated_key",
        DROP COLUMN "bpm_confidence",
        DROP COLUMN "estimated_bpm",
        DROP COLUMN "bitrate_bps",
        DROP COLUMN "channels",
        DROP COLUMN "sample_rate_hz",
        DROP COLUMN "duration_seconds",
        DROP COLUMN "codec",
        DROP COLUMN "detected_format",
        DROP COLUMN "analysis_method",
        DROP COLUMN "analysis_version",
        DROP COLUMN "analyzed_at",
        DROP COLUMN "analysis_error",
        DROP COLUMN "analysis_progress",
        DROP COLUMN "analysis_status"
    `);
  }
}
