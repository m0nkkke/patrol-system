import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRouteSetupToShops1781760000000 implements MigrationInterface {
  name = 'AddRouteSetupToShops1781760000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shops
        ADD COLUMN external_id VARCHAR(50),
        ADD COLUMN route_status VARCHAR(32) NOT NULL DEFAULT 'not_configured',
        ADD COLUMN route_expected_points SMALLINT NOT NULL DEFAULT 0,
        ADD COLUMN route_registered_points SMALLINT NOT NULL DEFAULT 0,
        ADD CONSTRAINT uq_shops_external_id UNIQUE (external_id),
        ADD CONSTRAINT chk_shops_route_points
          CHECK (route_registered_points <= route_expected_points),
        ADD CONSTRAINT chk_shops_route_status
          CHECK (route_status IN ('not_configured', 'setup_in_progress', 'ready'));

      CREATE INDEX idx_shops_external_id ON shops(external_id) WHERE external_id IS NOT NULL;
      CREATE INDEX idx_shops_route_status ON shops(route_status);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_shops_route_status;
      DROP INDEX IF EXISTS idx_shops_external_id;

      ALTER TABLE shops
        DROP CONSTRAINT IF EXISTS chk_shops_route_status,
        DROP CONSTRAINT IF EXISTS chk_shops_route_points,
        DROP CONSTRAINT IF EXISTS uq_shops_external_id,
        DROP COLUMN IF EXISTS route_registered_points,
        DROP COLUMN IF EXISTS route_expected_points,
        DROP COLUMN IF EXISTS route_status,
        DROP COLUMN IF EXISTS external_id;
    `);
  }
}
