import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalysisTransparency1789257600000 implements MigrationInterface {
  name = 'AnalysisTransparency1789257600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "library_tracks" ADD "analysis_evidence" jsonb`);
    await queryRunner.query(`ALTER TABLE "library_tracks" ADD "user_genre_tags" text array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "library_tracks" ADD "user_mood_tags" text array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "library_tracks" ADD "user_instrument_tags" text array NOT NULL DEFAULT '{}'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "library_tracks" DROP COLUMN "user_instrument_tags"`);
    await queryRunner.query(`ALTER TABLE "library_tracks" DROP COLUMN "user_mood_tags"`);
    await queryRunner.query(`ALTER TABLE "library_tracks" DROP COLUMN "user_genre_tags"`);
    await queryRunner.query(`ALTER TABLE "library_tracks" DROP COLUMN "analysis_evidence"`);
  }
}
