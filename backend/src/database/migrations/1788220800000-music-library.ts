import { MigrationInterface, QueryRunner } from 'typeorm';

export class MusicLibrary1788220800000 implements MigrationInterface {
  name = 'MusicLibrary1788220800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "library_tracks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "artist" varchar(200),
        "notes" varchar(2000),
        "original_filename" varchar(255) NOT NULL,
        "content_type" varchar(50) NOT NULL,
        "size_bytes" integer NOT NULL,
        "object_key" varchar(500) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "error_message" varchar(500),
        "upload_expires_at" timestamptz NOT NULL,
        "uploaded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_library_tracks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_library_tracks_object_key" UNIQUE ("object_key"),
        CONSTRAINT "CHK_library_tracks_status" CHECK ("status" IN ('pending', 'ready', 'failed')),
        CONSTRAINT "CHK_library_tracks_size" CHECK ("size_bytes" > 0),
        CONSTRAINT "FK_library_tracks_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_library_tracks_owner_updated_at" ON "library_tracks" ("owner_id", "updated_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_library_tracks_owner_updated_at"',
    );
    await queryRunner.query('DROP TABLE "library_tracks"');
  }
}
