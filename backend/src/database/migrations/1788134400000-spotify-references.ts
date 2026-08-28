import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpotifyReferences1788134400000 implements MigrationInterface {
  name = 'SpotifyReferences1788134400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "music_references" ADD "album" varchar(300)',
    );
    await queryRunner.query(
      'ALTER TABLE "music_references" DROP CONSTRAINT "CHK_music_references_source"',
    );
    await queryRunner.query(`
      ALTER TABLE "music_references"
      ADD CONSTRAINT "CHK_music_references_source"
      CHECK ("source" IN ('youtube', 'spotify'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DELETE FROM "music_references" WHERE "source" = \'spotify\'',
    );
    await queryRunner.query(
      'ALTER TABLE "music_references" DROP CONSTRAINT "CHK_music_references_source"',
    );
    await queryRunner.query(`
      ALTER TABLE "music_references"
      ADD CONSTRAINT "CHK_music_references_source"
      CHECK ("source" IN ('youtube'))
    `);
    await queryRunner.query(
      'ALTER TABLE "music_references" DROP COLUMN "album"',
    );
  }
}
