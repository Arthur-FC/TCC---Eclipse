import { MigrationInterface, QueryRunner } from 'typeorm';

export class DistributedRateLimits1788915600000 implements MigrationInterface {
  name = 'DistributedRateLimits1788915600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "request_rate_limits" (
        "bucket_key" character varying(80) NOT NULL,
        "window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "request_count" integer NOT NULL DEFAULT 1,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_request_rate_limits" PRIMARY KEY ("bucket_key", "window_start")
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_request_rate_limits_expires_at" ON "request_rate_limits" ("expires_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "request_rate_limits"');
  }
}
