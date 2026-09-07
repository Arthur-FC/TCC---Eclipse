import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinalWorks1788742800000 implements MigrationInterface {
  name = 'FinalWorks1788742800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
      ADD "source_project_id" uuid,
      ADD "source_project_title" varchar(120),
      ADD "work_version" integer,
      ADD "completed_at" timestamptz,
      ADD "creative_origin" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
      ADD CONSTRAINT "FK_library_tracks_source_project"
      FOREIGN KEY ("source_project_id") REFERENCES "projects"("id")
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_library_tracks_final_work_version"
      ON "library_tracks" ("source_project_id", "work_version")
      WHERE "source_project_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_library_tracks_final_work_version"');
    await queryRunner.query('ALTER TABLE "library_tracks" DROP CONSTRAINT "FK_library_tracks_source_project"');
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
      DROP COLUMN "creative_origin",
      DROP COLUMN "completed_at",
      DROP COLUMN "work_version",
      DROP COLUMN "source_project_title",
      DROP COLUMN "source_project_id"
    `);
  }
}
