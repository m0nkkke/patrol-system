import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1781160000000 implements MigrationInterface {
  name = 'InitialSchema1781160000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
      CREATE TYPE patrol_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue', 'cancelled');
      CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

      CREATE TABLE regions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Moscow',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX idx_shops_region_id ON shops(region_id);
      CREATE INDEX idx_shops_is_active ON shops(is_active) WHERE is_active = TRUE;
      CREATE INDEX idx_shops_deleted_at ON shops(deleted_at) WHERE deleted_at IS NULL;

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
        role user_role NOT NULL DEFAULT 'employee',
        full_name VARCHAR(200) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_users_username UNIQUE (username)
      );

      CREATE INDEX idx_users_shop_id ON users(shop_id);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
      CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        device_id VARCHAR(200),
        ip_address INET,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
      );

      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

      CREATE TABLE nfc_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uid VARCHAR(32) NOT NULL,
        payload VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_nfc_tags_uid UNIQUE (uid),
        CONSTRAINT chk_nfc_tags_uid_lowercase CHECK (uid = LOWER(uid))
      );

      CREATE INDEX idx_nfc_tags_uid ON nfc_tags(uid);
      CREATE INDEX idx_nfc_tags_is_active ON nfc_tags(is_active) WHERE is_active = TRUE;

      CREATE TABLE patrol_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        nfc_tag_id UUID REFERENCES nfc_tags(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        sort_order SMALLINT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX idx_patrol_points_shop_id ON patrol_points(shop_id);
      CREATE INDEX idx_patrol_points_nfc_tag_id ON patrol_points(nfc_tag_id);
      CREATE INDEX idx_patrol_points_is_active ON patrol_points(is_active) WHERE is_active = TRUE;
      CREATE INDEX idx_patrol_points_deleted_at ON patrol_points(deleted_at) WHERE deleted_at IS NULL;

      CREATE TABLE patrol_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        weekdays SMALLINT[] NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
      );

      CREATE INDEX idx_patrol_schedules_shop_id ON patrol_schedules(shop_id);
      CREATE INDEX idx_patrol_schedules_is_active ON patrol_schedules(is_active) WHERE is_active = TRUE;

      CREATE TABLE patrols (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        schedule_id UUID REFERENCES patrol_schedules(id) ON DELETE SET NULL,
        status patrol_status NOT NULL DEFAULT 'pending',
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        due_at TIMESTAMPTZ,
        total_points SMALLINT NOT NULL DEFAULT 0,
        scanned_points SMALLINT NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_patrols_points CHECK (scanned_points <= total_points),
        CONSTRAINT chk_patrols_dates CHECK (completed_at IS NULL OR completed_at >= started_at)
      );

      CREATE INDEX idx_patrols_shop_id ON patrols(shop_id);
      CREATE INDEX idx_patrols_employee_id ON patrols(employee_id);
      CREATE INDEX idx_patrols_status ON patrols(status);
      CREATE INDEX idx_patrols_started_at ON patrols(started_at DESC);
      CREATE INDEX idx_patrols_due_at ON patrols(due_at) WHERE status IN ('pending', 'in_progress');
      CREATE INDEX idx_patrols_shop_started ON patrols(shop_id, started_at DESC);

      CREATE TABLE patrol_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
        patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE RESTRICT,
        nfc_tag_id UUID NOT NULL REFERENCES nfc_tags(id) ON DELETE RESTRICT,
        employee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        scanned_at TIMESTAMPTZ NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        nfc_uid VARCHAR(32) NOT NULL,
        device_id VARCHAR(200) NOT NULL,
        ip_address INET,
        lat DECIMAL(9,6),
        lng DECIMAL(9,6),
        gps_accuracy REAL,
        is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
        suspicion_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_patrol_event_point UNIQUE (patrol_id, patrol_point_id)
      );

      CREATE INDEX idx_patrol_events_patrol_id ON patrol_events(patrol_id);
      CREATE INDEX idx_patrol_events_employee_id ON patrol_events(employee_id);
      CREATE INDEX idx_patrol_events_patrol_point_id ON patrol_events(patrol_point_id);
      CREATE INDEX idx_patrol_events_nfc_uid ON patrol_events(nfc_uid);
      CREATE INDEX idx_patrol_events_scanned_at ON patrol_events(scanned_at DESC);
      CREATE INDEX idx_patrol_events_is_suspicious ON patrol_events(is_suspicious) WHERE is_suspicious = TRUE;

      CREATE TABLE alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
        patrol_id UUID REFERENCES patrols(id) ON DELETE SET NULL,
        severity alert_severity NOT NULL DEFAULT 'warning',
        type VARCHAR(100) NOT NULL,
        title VARCHAR(300) NOT NULL,
        body TEXT,
        is_sent BOOLEAN NOT NULL DEFAULT FALSE,
        sent_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_alerts_shop_id ON alerts(shop_id);
      CREATE INDEX idx_alerts_patrol_id ON alerts(patrol_id);
      CREATE INDEX idx_alerts_severity ON alerts(severity);
      CREATE INDEX idx_alerts_is_sent ON alerts(is_sent) WHERE is_sent = FALSE;
      CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

      CREATE TABLE audit_log (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        ip_address INET,
        device_id VARCHAR(200),
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
      CREATE INDEX idx_audit_log_action ON audit_log(action);
      CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
      CREATE INDEX idx_audit_log_meta ON audit_log USING GIN(meta);

      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_nfc_tags_updated_at BEFORE UPDATE ON nfc_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_patrol_points_updated_at BEFORE UPDATE ON patrol_points FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_patrol_schedules_updated_at BEFORE UPDATE ON patrol_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_patrols_updated_at BEFORE UPDATE ON patrols FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_patrols_updated_at ON patrols;
      DROP TRIGGER IF EXISTS trg_patrol_schedules_updated_at ON patrol_schedules;
      DROP TRIGGER IF EXISTS trg_patrol_points_updated_at ON patrol_points;
      DROP TRIGGER IF EXISTS trg_nfc_tags_updated_at ON nfc_tags;
      DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
      DROP TRIGGER IF EXISTS trg_shops_updated_at ON shops;
      DROP TRIGGER IF EXISTS trg_regions_updated_at ON regions;
      DROP FUNCTION IF EXISTS update_updated_at;
      DROP TABLE IF EXISTS audit_log;
      DROP TABLE IF EXISTS alerts;
      DROP TABLE IF EXISTS patrol_events;
      DROP TABLE IF EXISTS patrols;
      DROP TABLE IF EXISTS patrol_schedules;
      DROP TABLE IF EXISTS patrol_points;
      DROP TABLE IF EXISTS nfc_tags;
      DROP TABLE IF EXISTS refresh_tokens;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS shops;
      DROP TABLE IF EXISTS regions;
      DROP TYPE IF EXISTS alert_severity;
      DROP TYPE IF EXISTS patrol_status;
      DROP TYPE IF EXISTS user_role;
    `);
  }
}
