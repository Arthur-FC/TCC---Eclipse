import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiMessageMetadata1787702400000 implements MigrationInterface {
  name = 'AiMessageMetadata1787702400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "ai_provider" varchar(30)',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "ai_model" varchar(120)',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "prompt_tokens" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "completion_tokens" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "messages" ADD "ai_latency_ms" integer',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "ai_latency_ms"');
    await queryRunner.query(
      'ALTER TABLE "messages" DROP COLUMN "completion_tokens"',
    );
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "prompt_tokens"');
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "ai_model"');
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "ai_provider"');
  }
}
