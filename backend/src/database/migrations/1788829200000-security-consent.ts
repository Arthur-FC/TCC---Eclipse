import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityConsent1788829200000 implements MigrationInterface {
  name = 'SecurityConsent1788829200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
      ADD "processing_consent_at" timestamptz,
      ADD "processing_consent_version" varchar(20)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "library_tracks"
      DROP COLUMN "processing_consent_version",
      DROP COLUMN "processing_consent_at"
    `);
  }
}
