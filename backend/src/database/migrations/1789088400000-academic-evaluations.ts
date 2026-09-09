import { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademicEvaluations1789088400000 implements MigrationInterface {
  name = 'AcademicEvaluations1789088400000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "evaluation_responses" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "owner_id" uuid NOT NULL,
      "project_id" uuid NOT NULL,
      "reference_relevance" smallint NOT NULL,
      "moodboard_utility" smallint NOT NULL,
      "reuse_intent" smallint NOT NULL,
      "comments" varchar(2000),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_evaluation_responses" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_evaluation_responses_owner_project" UNIQUE ("owner_id", "project_id"),
      CONSTRAINT "CHK_evaluation_reference_relevance" CHECK ("reference_relevance" BETWEEN 1 AND 5),
      CONSTRAINT "CHK_evaluation_moodboard_utility" CHECK ("moodboard_utility" BETWEEN 1 AND 5),
      CONSTRAINT "CHK_evaluation_reuse_intent" CHECK ("reuse_intent" BETWEEN 1 AND 5),
      CONSTRAINT "FK_evaluation_responses_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_evaluation_responses_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "evaluation_responses"');
  }
}
