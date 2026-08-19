import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniversalRouteSetterAndAnonymousAppeals1781776000000 implements MigrationInterface {
  name = 'AddUniversalRouteSetterAndAnonymousAppeals1781776000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_universal_route_setter BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS universal_auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_full_name VARCHAR(200) NOT NULL,
        device_id VARCHAR(200) NOT NULL,
        ip_address INET,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_universal_auth_sessions_user_id
        ON universal_auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_universal_auth_sessions_expires_at
        ON universal_auth_sessions(expires_at);

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anonymous_appeal_category') THEN
          CREATE TYPE anonymous_appeal_category AS ENUM ('message', 'complaint', 'safety', 'other');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anonymous_appeal_status') THEN
          CREATE TYPE anonymous_appeal_status AS ENUM ('new', 'in_review', 'resolved', 'archived');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS anonymous_appeals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        category anonymous_appeal_category NOT NULL DEFAULT 'message',
        status anonymous_appeal_status NOT NULL DEFAULT 'new',
        message TEXT NOT NULL,
        device_id VARCHAR(200),
        ip_address INET,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_anonymous_appeals_shop_id ON anonymous_appeals(shop_id);
      CREATE INDEX IF NOT EXISTS idx_anonymous_appeals_category ON anonymous_appeals(category);
      CREATE INDEX IF NOT EXISTS idx_anonymous_appeals_status ON anonymous_appeals(status);
      CREATE INDEX IF NOT EXISTS idx_anonymous_appeals_created_at ON anonymous_appeals(created_at DESC);

      CREATE TRIGGER trg_anonymous_appeals_updated_at
        BEFORE UPDATE ON anonymous_appeals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_anonymous_appeals_updated_at ON anonymous_appeals;
      DROP TABLE IF EXISTS anonymous_appeals;
      DROP TYPE IF EXISTS anonymous_appeal_status;
      DROP TYPE IF EXISTS anonymous_appeal_category;
      DROP TABLE IF EXISTS universal_auth_sessions;
      ALTER TABLE users DROP COLUMN IF EXISTS is_universal_route_setter;
    `);
  }
}
