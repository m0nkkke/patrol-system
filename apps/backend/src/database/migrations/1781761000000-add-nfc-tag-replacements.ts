import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNfcTagReplacements1781761000000 implements MigrationInterface {
  name = 'AddNfcTagReplacements1781761000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE nfc_tag_replacements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrol_point_id UUID NOT NULL REFERENCES patrol_points(id) ON DELETE CASCADE,
        old_nfc_tag_id UUID REFERENCES nfc_tags(id) ON DELETE SET NULL,
        old_nfc_uid VARCHAR(32),
        new_nfc_tag_id UUID NOT NULL REFERENCES nfc_tags(id) ON DELETE RESTRICT,
        new_nfc_uid VARCHAR(32) NOT NULL,
        replaced_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_nfc_tag_replacements_patrol_point_id
        ON nfc_tag_replacements(patrol_point_id);
      CREATE INDEX idx_nfc_tag_replacements_created_at
        ON nfc_tag_replacements(created_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_nfc_tag_replacements_created_at;
      DROP INDEX IF EXISTS idx_nfc_tag_replacements_patrol_point_id;
      DROP TABLE IF EXISTS nfc_tag_replacements;
    `);
  }
}
