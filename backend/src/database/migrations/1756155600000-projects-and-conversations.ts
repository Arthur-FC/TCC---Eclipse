import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectsAndConversations1756155600000
  implements MigrationInterface
{
  name = 'ProjectsAndConversations1756155600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "title" varchar(120) NOT NULL,
        "description" varchar(2000),
        "archived_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_projects_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "title" varchar(120) NOT NULL DEFAULT 'Nova conversa',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL,
        "role" varchar(20) NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_messages_role" CHECK ("role" IN ('user', 'assistant')),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id")
          REFERENCES "conversations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_projects_owner_updated_at" ON "projects" ("owner_id", "updated_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_conversations_project_updated_at" ON "conversations" ("project_id", "updated_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_messages_conversation_created_at" ON "messages" ("conversation_id", "created_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "messages"');
    await queryRunner.query('DROP TABLE "conversations"');
    await queryRunner.query('DROP TABLE "projects"');
  }
}
