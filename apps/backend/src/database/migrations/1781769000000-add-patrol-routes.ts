import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatrolRoutes1781769000000 implements MigrationInterface {
  name = 'AddPatrolRoutes1781769000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE patrol_route_category AS ENUM ('internal', 'external');

      CREATE TABLE patrol_routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category patrol_route_category NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX idx_patrol_routes_shop_id ON patrol_routes(shop_id);
      CREATE INDEX idx_patrol_routes_category ON patrol_routes(category);
      CREATE INDEX idx_patrol_routes_is_active ON patrol_routes(is_active) WHERE is_active = TRUE;
      CREATE INDEX idx_patrol_routes_deleted_at ON patrol_routes(deleted_at) WHERE deleted_at IS NULL;

      CREATE TABLE patrol_route_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES patrol_routes(id) ON DELETE CASCADE,
        patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE RESTRICT,
        sort_order SMALLINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_patrol_route_points_route_sort UNIQUE (route_id, sort_order),
        CONSTRAINT uq_patrol_route_points_route_point UNIQUE (route_id, patrol_point_id)
      );

      CREATE INDEX idx_patrol_route_points_route_id ON patrol_route_points(route_id);
      CREATE INDEX idx_patrol_route_points_patrol_point_id ON patrol_route_points(patrol_point_id);

      ALTER TABLE patrol_schedules
        ADD COLUMN route_id UUID REFERENCES patrol_routes(id) ON DELETE SET NULL;
      CREATE INDEX idx_patrol_schedules_route_id ON patrol_schedules(route_id);

      ALTER TABLE patrols
        ADD COLUMN route_id UUID REFERENCES patrol_routes(id) ON DELETE SET NULL;
      CREATE INDEX idx_patrols_route_id ON patrols(route_id);

      CREATE TRIGGER trg_patrol_routes_updated_at BEFORE UPDATE ON patrol_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_patrol_routes_updated_at ON patrol_routes;
      DROP INDEX IF EXISTS idx_patrols_route_id;
      ALTER TABLE patrols DROP COLUMN IF EXISTS route_id;
      DROP INDEX IF EXISTS idx_patrol_schedules_route_id;
      ALTER TABLE patrol_schedules DROP COLUMN IF EXISTS route_id;
      DROP TABLE IF EXISTS patrol_route_points;
      DROP TABLE IF EXISTS patrol_routes;
      DROP TYPE IF EXISTS patrol_route_category;
    `);
  }
}
