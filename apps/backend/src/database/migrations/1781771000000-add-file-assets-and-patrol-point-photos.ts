import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileAssetsAndPatrolPointPhotos1781771000000 implements MigrationInterface {
  name = 'AddFileAssetsAndPatrolPointPhotos1781771000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE file_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type VARCHAR(64) NOT NULL,
        owner_id UUID,
        kind VARCHAR(64) NOT NULL,
        storage VARCHAR(32) NOT NULL,
        storage_key TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        original_name TEXT,
        size_bytes INTEGER NOT NULL,
        checksum_sha256 VARCHAR(64) NOT NULL,
        width INTEGER,
        height INTEGER,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,

        CONSTRAINT chk_file_assets_storage CHECK (storage IN ('local', 'object')),
        CONSTRAINT chk_file_assets_size CHECK (size_bytes > 0)
      );

      ALTER TABLE patrol_points
        ADD COLUMN photo_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL;

      CREATE INDEX idx_file_assets_owner ON file_assets(owner_type, owner_id);
      CREATE INDEX idx_file_assets_kind ON file_assets(kind);
      CREATE INDEX idx_file_assets_deleted_at ON file_assets(deleted_at) WHERE deleted_at IS NULL;
      CREATE INDEX idx_patrol_points_photo_file_id ON patrol_points(photo_file_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_patrol_points_photo_file_id;
      DROP INDEX IF EXISTS idx_file_assets_deleted_at;
      DROP INDEX IF EXISTS idx_file_assets_kind;
      DROP INDEX IF EXISTS idx_file_assets_owner;

      ALTER TABLE patrol_points
        DROP COLUMN IF EXISTS photo_file_id;

      DROP TABLE IF EXISTS file_assets;
    `);
  }
}
