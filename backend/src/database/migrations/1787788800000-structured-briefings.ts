import { MigrationInterface, QueryRunner } from 'typeorm';

export class StructuredBriefings1787788800000 implements MigrationInterface {
  name = 'StructuredBriefings1787788800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "briefings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "source_conversation_id" uuid,
        "version" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "data" jsonb NOT NULL,
        "ai_provider" varchar(30),
        "ai_model" varchar(120),
        "prompt_tokens" integer,
        "completion_tokens" integer,
        "confirmed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_briefings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_briefings_project_version" UNIQUE ("project_id", "version"),
        CONSTRAINT "CHK_briefings_status" CHECK ("status" IN ('draft', 'confirmed')),
        CONSTRAINT "CHK_briefings_version" CHECK ("version" > 0),
        CONSTRAINT "FK_briefings_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_briefings_source_conversation" FOREIGN KEY ("source_conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_briefings_project_created_at" ON "briefings" ("project_id", "created_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_briefings_project_created_at"');
    await queryRunner.query('DROP TABLE "briefings"');
  }
}
