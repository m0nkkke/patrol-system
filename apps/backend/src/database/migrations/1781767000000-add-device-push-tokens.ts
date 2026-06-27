import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDevicePushTokens1781767000000 implements MigrationInterface {
  name = 'AddDevicePushTokens1781767000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE device_push_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(200) NOT NULL,
        push_token VARCHAR(200) NOT NULL,
        platform VARCHAR(20),
        app_version VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_device_push_tokens_token
      ON device_push_tokens(push_token)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_device_push_tokens_user_id
      ON device_push_tokens(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_device_push_tokens_device_id
      ON device_push_tokens(device_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_device_push_tokens_device_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_device_push_tokens_user_id');
    await queryRunner.query('DROP INDEX IF EXISTS uq_device_push_tokens_token');
    await queryRunner.query('DROP TABLE IF EXISTS device_push_tokens');
  }
}
