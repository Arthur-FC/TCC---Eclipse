import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiToolExecutions1787961600000 implements MigrationInterface {
  name = 'AiToolExecutions1787961600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_tool_executions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "conversation_id" uuid NOT NULL,
        "tool_call_id" varchar(120) NOT NULL,
        "tool_name" varchar(80) NOT NULL,
        "status" varchar(20) NOT NULL,
        "duration_ms" integer NOT NULL,
        "error_code" varchar(60),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_tool_executions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ai_tool_executions_status" CHECK ("status" IN ('completed', 'failed', 'rejected')),
        CONSTRAINT "CHK_ai_tool_executions_duration" CHECK ("duration_ms" >= 0),
        CONSTRAINT "FK_ai_tool_executions_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ai_tool_executions_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_ai_tool_executions_project_created_at" ON "ai_tool_executions" ("project_id", "created_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_ai_tool_executions_project_created_at"',
    );
    await queryRunner.query('DROP TABLE "ai_tool_executions"');
  }
}
