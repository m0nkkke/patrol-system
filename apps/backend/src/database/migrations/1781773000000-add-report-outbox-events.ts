import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportOutboxEvents1781773000000 implements MigrationInterface {
  name = 'AddReportOutboxEvents1781773000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE report_outbox_status AS ENUM ('pending', 'sent', 'failed');

      CREATE TABLE report_outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL UNIQUE,
        event_type VARCHAR(100) NOT NULL,
        source_service VARCHAR(64) NOT NULL DEFAULT 'patrol',
        schema_version VARCHAR(16) NOT NULL DEFAULT '1.0',
        payload JSONB NOT NULL,
        status report_outbox_status NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_report_outbox_events_event_id ON report_outbox_events(event_id);
      CREATE INDEX idx_report_outbox_events_event_type ON report_outbox_events(event_type);
      CREATE INDEX idx_report_outbox_events_status ON report_outbox_events(status);
      CREATE INDEX idx_report_outbox_events_next_attempt_at ON report_outbox_events(next_attempt_at);
      CREATE INDEX idx_report_outbox_events_created_at ON report_outbox_events(created_at DESC);
      CREATE TRIGGER trg_report_outbox_events_updated_at BEFORE UPDATE ON report_outbox_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_report_outbox_events_updated_at ON report_outbox_events;
      DROP INDEX IF EXISTS idx_report_outbox_events_created_at;
      DROP INDEX IF EXISTS idx_report_outbox_events_next_attempt_at;
      DROP INDEX IF EXISTS idx_report_outbox_events_status;
      DROP INDEX IF EXISTS idx_report_outbox_events_event_type;
      DROP INDEX IF EXISTS idx_report_outbox_events_event_id;
      DROP TABLE IF EXISTS report_outbox_events;
      DROP TYPE IF EXISTS report_outbox_status;
    `);
  }
}
