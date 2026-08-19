import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointVisitsAndScanActions1781777000000 implements MigrationInterface {
  name = 'AddPointVisitsAndScanActions1781777000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrol_events DROP CONSTRAINT IF EXISTS uq_patrol_event_point;

      ALTER TABLE patrol_events
        ADD COLUMN IF NOT EXISTS point_visit_id UUID,
        ADD COLUMN IF NOT EXISTS scan_action VARCHAR(20) NOT NULL DEFAULT 'arrive',
        ADD COLUMN IF NOT EXISTS accepted BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(100);

      CREATE TABLE patrol_point_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
        patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE RESTRICT,
        status VARCHAR(50) NOT NULL,
        arrived_at TIMESTAMPTZ NOT NULL,
        locked_until TIMESTAMPTZ NOT NULL,
        departed_at TIMESTAMPTZ,
        dwell_seconds INTEGER,
        arrival_event_id UUID REFERENCES patrol_events(id) ON DELETE SET NULL,
        departure_event_id UUID REFERENCES patrol_events(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_patrol_point_visits_patrol_point UNIQUE (patrol_id, patrol_point_id),
        CONSTRAINT chk_patrol_point_visit_status
          CHECK (status IN ('pending', 'arrived', 'ready_to_depart', 'completed')),
        CONSTRAINT chk_patrol_point_visit_dwell
          CHECK (dwell_seconds IS NULL OR dwell_seconds >= 0)
      );

      ALTER TABLE patrol_events
        ADD CONSTRAINT fk_patrol_events_point_visit
        FOREIGN KEY (point_visit_id) REFERENCES patrol_point_visits(id) ON DELETE SET NULL;

      CREATE UNIQUE INDEX uq_patrol_event_point_action_accepted
        ON patrol_events(patrol_id, patrol_point_id, scan_action)
        WHERE accepted = TRUE AND late_sync = FALSE;

      CREATE INDEX idx_patrol_events_point_visit_id ON patrol_events(point_visit_id);
      CREATE INDEX idx_patrol_events_scan_action ON patrol_events(scan_action);
      CREATE INDEX idx_patrol_events_accepted ON patrol_events(accepted);
      CREATE INDEX idx_patrol_point_visits_patrol_id ON patrol_point_visits(patrol_id);
      CREATE INDEX idx_patrol_point_visits_patrol_point_id ON patrol_point_visits(patrol_point_id);
      CREATE INDEX idx_patrol_point_visits_status ON patrol_point_visits(status);

      ALTER TABLE patrol_incidents DROP CONSTRAINT IF EXISTS chk_patrol_incident_type;
      ALTER TABLE patrol_incidents
        ADD CONSTRAINT chk_patrol_incident_type
        CHECK (
          type IN (
            'short_interval',
            'long_interval',
            'missed_point',
            'patrol_overdue',
            'schedule_deviation',
            'route_too_fast',
            'route_suspiciously_fast',
            'route_too_slow',
            'point_dwell_too_short'
          )
        );

      CREATE TRIGGER trg_patrol_point_visits_updated_at
        BEFORE UPDATE ON patrol_point_visits
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_patrol_point_visits_updated_at ON patrol_point_visits;
      ALTER TABLE patrol_incidents DROP CONSTRAINT IF EXISTS chk_patrol_incident_type;
      ALTER TABLE patrol_incidents
        ADD CONSTRAINT chk_patrol_incident_type
        CHECK (type IN ('short_interval', 'long_interval', 'missed_point'));
      DROP INDEX IF EXISTS idx_patrol_point_visits_status;
      DROP INDEX IF EXISTS idx_patrol_point_visits_patrol_point_id;
      DROP INDEX IF EXISTS idx_patrol_point_visits_patrol_id;
      DROP INDEX IF EXISTS idx_patrol_events_accepted;
      DROP INDEX IF EXISTS idx_patrol_events_scan_action;
      DROP INDEX IF EXISTS idx_patrol_events_point_visit_id;
      DROP INDEX IF EXISTS uq_patrol_event_point_action_accepted;
      ALTER TABLE patrol_events DROP CONSTRAINT IF EXISTS fk_patrol_events_point_visit;
      DROP TABLE IF EXISTS patrol_point_visits;
      ALTER TABLE patrol_events
        DROP COLUMN IF EXISTS rejection_reason,
        DROP COLUMN IF EXISTS accepted,
        DROP COLUMN IF EXISTS scan_action,
        DROP COLUMN IF EXISTS point_visit_id;
      ALTER TABLE patrol_events
        ADD CONSTRAINT uq_patrol_event_point UNIQUE (patrol_id, patrol_point_id);
    `);
  }
}
