import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatrolReports1781772000000 implements MigrationInterface {
  name = 'AddPatrolReports1781772000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE patrol_report_type AS ENUM (
        'photo_report',
        'morning',
        'closing',
        'sunday',
        'heating',
        'evacuation'
      );

      CREATE TYPE patrol_report_status AS ENUM (
        'draft',
        'submitted',
        'cancelled'
      );

      CREATE TABLE patrol_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_type patrol_report_type NOT NULL,
        status patrol_report_status NOT NULL DEFAULT 'draft',
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        patrol_id UUID REFERENCES patrols(id) ON DELETE SET NULL,
        route_id UUID REFERENCES patrol_routes(id) ON DELETE SET NULL,
        schedule_id UUID REFERENCES patrol_schedules(id) ON DELETE SET NULL,
        period patrol_period,
        source_service VARCHAR(64) NOT NULL DEFAULT 'patrol',
        schema_version VARCHAR(16) NOT NULL DEFAULT '1.0',
        fields JSONB NOT NULL DEFAULT '{}'::jsonb,
        comment TEXT,
        cancellation_reason TEXT,
        submitted_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE patrol_report_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES patrol_reports(id) ON DELETE CASCADE,
        file_id UUID NOT NULL REFERENCES file_assets(id) ON DELETE RESTRICT,
        kind VARCHAR(64) NOT NULL DEFAULT 'report_photo',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_patrol_report_files_report_file UNIQUE (report_id, file_id)
      );

      CREATE INDEX idx_patrol_reports_report_type ON patrol_reports(report_type);
      CREATE INDEX idx_patrol_reports_status ON patrol_reports(status);
      CREATE INDEX idx_patrol_reports_shop_id ON patrol_reports(shop_id);
      CREATE INDEX idx_patrol_reports_employee_id ON patrol_reports(employee_id);
      CREATE INDEX idx_patrol_reports_patrol_id ON patrol_reports(patrol_id);
      CREATE INDEX idx_patrol_reports_period ON patrol_reports(period);
      CREATE INDEX idx_patrol_reports_submitted_at ON patrol_reports(submitted_at DESC);
      CREATE INDEX idx_patrol_reports_created_at ON patrol_reports(created_at DESC);
      CREATE INDEX idx_patrol_report_files_report_id ON patrol_report_files(report_id);
      CREATE INDEX idx_patrol_report_files_file_id ON patrol_report_files(file_id);
      CREATE TRIGGER trg_patrol_reports_updated_at BEFORE UPDATE ON patrol_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_patrol_reports_updated_at ON patrol_reports;
      DROP INDEX IF EXISTS idx_patrol_report_files_file_id;
      DROP INDEX IF EXISTS idx_patrol_report_files_report_id;
      DROP INDEX IF EXISTS idx_patrol_reports_created_at;
      DROP INDEX IF EXISTS idx_patrol_reports_submitted_at;
      DROP INDEX IF EXISTS idx_patrol_reports_period;
      DROP INDEX IF EXISTS idx_patrol_reports_patrol_id;
      DROP INDEX IF EXISTS idx_patrol_reports_employee_id;
      DROP INDEX IF EXISTS idx_patrol_reports_shop_id;
      DROP INDEX IF EXISTS idx_patrol_reports_status;
      DROP INDEX IF EXISTS idx_patrol_reports_report_type;

      DROP TABLE IF EXISTS patrol_report_files;
      DROP TABLE IF EXISTS patrol_reports;
      DROP TYPE IF EXISTS patrol_report_status;
      DROP TYPE IF EXISTS patrol_report_type;
    `);
  }
}
