import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAccessKeys1781764000000 implements MigrationInterface {
  name = 'AddUserAccessKeys1781764000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS access_key VARCHAR(32),
        ADD COLUMN IF NOT EXISTS access_key_hash VARCHAR(64);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_access_key
        ON users(access_key) WHERE access_key IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_access_key_hash
        ON users(access_key_hash) WHERE access_key_hash IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_users_access_key_hash;
      DROP INDEX IF EXISTS uq_users_access_key;

      ALTER TABLE users
        DROP COLUMN IF EXISTS access_key_hash,
        DROP COLUMN IF EXISTS access_key;
    `);
  }
}
