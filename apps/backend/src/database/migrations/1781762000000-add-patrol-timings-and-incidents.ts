import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatrolTimingsAndIncidents1781762000000 implements MigrationInterface {
  name = 'AddPatrolTimingsAndIncidents1781762000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE patrol_route_intervals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        from_patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE CASCADE,
        to_patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE CASCADE,
        from_sort_order SMALLINT NOT NULL,
        to_sort_order SMALLINT NOT NULL,
        baseline_seconds INTEGER NOT NULL,
        min_seconds INTEGER NOT NULL,
        max_seconds INTEGER NOT NULL,
        source_patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_patrol_route_interval_points
          UNIQUE (shop_id, from_patrol_point_id, to_patrol_point_id),
        CONSTRAINT chk_patrol_route_interval_seconds
          CHECK (baseline_seconds >= 0 AND min_seconds >= 0 AND max_seconds >= min_seconds)
      );

      CREATE INDEX idx_patrol_route_intervals_shop_id ON patrol_route_intervals(shop_id);

      CREATE TABLE patrol_incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
        patrol_event_id UUID REFERENCES patrol_events(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        from_patrol_point_id UUID REFERENCES patrol_points(id) ON DELETE SET NULL,
        to_patrol_point_id UUID REFERENCES patrol_points(id) ON DELETE SET NULL,
        expected_seconds INTEGER,
        actual_seconds INTEGER,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_patrol_incident_type
          CHECK (type IN ('short_interval', 'long_interval', 'missed_point'))
      );

      CREATE INDEX idx_patrol_incidents_shop_id ON patrol_incidents(shop_id);
      CREATE INDEX idx_patrol_incidents_patrol_id ON patrol_incidents(patrol_id);
      CREATE INDEX idx_patrol_incidents_type ON patrol_incidents(type);
      CREATE INDEX idx_patrol_incidents_created_at ON patrol_incidents(created_at DESC);

      CREATE TRIGGER trg_patrol_route_intervals_updated_at
        BEFORE UPDATE ON patrol_route_intervals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_patrol_route_intervals_updated_at ON patrol_route_intervals;
      DROP INDEX IF EXISTS idx_patrol_incidents_created_at;
      DROP INDEX IF EXISTS idx_patrol_incidents_type;
      DROP INDEX IF EXISTS idx_patrol_incidents_patrol_id;
      DROP INDEX IF EXISTS idx_patrol_incidents_shop_id;
      DROP TABLE IF EXISTS patrol_incidents;
      DROP INDEX IF EXISTS idx_patrol_route_intervals_shop_id;
      DROP TABLE IF EXISTS patrol_route_intervals;
    `);
  }
}
