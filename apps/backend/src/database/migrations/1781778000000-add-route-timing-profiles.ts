import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRouteTimingProfiles1781778000000 implements MigrationInterface {
  name = 'AddRouteTimingProfiles1781778000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE route_timing_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES patrol_routes(id) ON DELETE CASCADE,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        sample_count INTEGER NOT NULL,
        average_total_seconds INTEGER NOT NULL,
        suspicious_fast_seconds INTEGER NOT NULL,
        fast_seconds INTEGER NOT NULL,
        slow_seconds INTEGER NOT NULL,
        calculated_from TIMESTAMPTZ NOT NULL,
        calculated_to TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_route_timing_profiles_route_id UNIQUE (route_id),
        CONSTRAINT chk_route_timing_profile_samples CHECK (sample_count > 0),
        CONSTRAINT chk_route_timing_profile_seconds
          CHECK (
            average_total_seconds > 0
            AND suspicious_fast_seconds >= 0
            AND fast_seconds >= suspicious_fast_seconds
            AND slow_seconds >= fast_seconds
          ),
        CONSTRAINT chk_route_timing_profile_window CHECK (calculated_to >= calculated_from)
      );

      CREATE INDEX idx_route_timing_profiles_route_id ON route_timing_profiles(route_id);
      CREATE INDEX idx_route_timing_profiles_shop_id ON route_timing_profiles(shop_id);

      CREATE TRIGGER trg_route_timing_profiles_updated_at
        BEFORE UPDATE ON route_timing_profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_route_timing_profiles_updated_at ON route_timing_profiles;
      DROP INDEX IF EXISTS idx_route_timing_profiles_shop_id;
      DROP INDEX IF EXISTS idx_route_timing_profiles_route_id;
      DROP TABLE IF EXISTS route_timing_profiles;
    `);
  }
}
