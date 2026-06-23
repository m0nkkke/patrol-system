import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserShopAssignments1781765000000 implements MigrationInterface {
  name = 'AddUserShopAssignments1781765000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_shop_assignments (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_user_shop_assignments PRIMARY KEY (user_id, shop_id)
      );

      CREATE INDEX idx_user_shop_assignments_shop_id
        ON user_shop_assignments(shop_id);

      INSERT INTO user_shop_assignments (user_id, shop_id)
      SELECT id, shop_id
      FROM users
      WHERE shop_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_shop_assignments;
    `);
  }
}
