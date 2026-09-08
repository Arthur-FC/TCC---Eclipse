import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroqDailyBudget1789002000000 implements MigrationInterface {
  name = 'GroqDailyBudget1789002000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "groq_usage_daily" (
        "usage_date" date NOT NULL,
        "request_count" integer NOT NULL DEFAULT 0,
        "reserved_completion_tokens" integer NOT NULL DEFAULT 0,
        "prompt_tokens" integer NOT NULL DEFAULT 0,
        "completion_tokens" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_groq_usage_daily" PRIMARY KEY ("usage_date")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "groq_usage_daily"');
  }
}
