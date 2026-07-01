import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessionVersion1781768000000 implements MigrationInterface {
  name = 'AddUserSessionVersion1781768000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS session_version
    `);
  }
}
