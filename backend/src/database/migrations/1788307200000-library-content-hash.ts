import { MigrationInterface, QueryRunner } from 'typeorm';

export class LibraryContentHash1788307200000 implements MigrationInterface {
  name = 'LibraryContentHash1788307200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "library_tracks" AS older
      USING "library_tracks" AS newer
      WHERE older."owner_id" = newer."owner_id"
        AND older."original_filename" = newer."original_filename"
        AND older."size_bytes" = newer."size_bytes"
        AND older."status" = 'failed'
        AND newer."status" = 'failed'
        AND (older."created_at", older."id") < (newer."created_at", newer."id")
    `);
    await queryRunner.query(
      'ALTER TABLE "library_tracks" ADD "content_hash" char(64)',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_library_tracks_owner_content_hash"
      ON "library_tracks" ("owner_id", "content_hash")
      WHERE "content_hash" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "UQ_library_tracks_owner_content_hash"',
    );
    await queryRunner.query(
      'ALTER TABLE "library_tracks" DROP COLUMN "content_hash"',
    );
  }
}
