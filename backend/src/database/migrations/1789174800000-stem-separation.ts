import { MigrationInterface, QueryRunner } from 'typeorm';

export class StemSeparation1789174800000 implements MigrationInterface {
  name = 'StemSeparation1789174800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stem_separations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reference_id" uuid NOT NULL,
        "input_track_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'queued',
        "progress" smallint NOT NULL DEFAULT 0,
        "model_name" varchar(80) NOT NULL,
        "model_version" varchar(80) NOT NULL,
        "error_message" varchar(500),
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stem_separations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stem_separations_reference" UNIQUE ("reference_id"),
        CONSTRAINT "FK_stem_separations_reference" FOREIGN KEY ("reference_id") REFERENCES "music_references"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stem_separations_track" FOREIGN KEY ("input_track_id") REFERENCES "library_tracks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "reference_stems" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "separation_id" uuid NOT NULL,
        "type" varchar(20) NOT NULL,
        "object_key" varchar(500) NOT NULL,
        "content_type" varchar(50) NOT NULL DEFAULT 'audio/wav',
        "size_bytes" integer NOT NULL,
        CONSTRAINT "PK_reference_stems" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reference_stems_separation_type" UNIQUE ("separation_id", "type"),
        CONSTRAINT "UQ_reference_stems_object_key" UNIQUE ("object_key"),
        CONSTRAINT "FK_reference_stems_separation" FOREIGN KEY ("separation_id") REFERENCES "stem_separations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "stem_separation_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "separation_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'queued',
        "attempts" smallint NOT NULL DEFAULT 0,
        "available_at" timestamptz NOT NULL,
        "locked_at" timestamptz,
        "error_message" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stem_separation_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_stem_separation_jobs_separation" UNIQUE ("separation_id"),
        CONSTRAINT "FK_stem_separation_jobs_separation" FOREIGN KEY ("separation_id") REFERENCES "stem_separations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_stem_separation_jobs_queue" ON "stem_separation_jobs" ("status", "available_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_stem_separation_jobs_queue"`);
    await queryRunner.query(`DROP TABLE "stem_separation_jobs"`);
    await queryRunner.query(`DROP TABLE "reference_stems"`);
    await queryRunner.query(`DROP TABLE "stem_separations"`);
  }
}
