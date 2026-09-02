import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceActivePatrolPointNfcUniqueness1781779000000 implements MigrationInterface {
  name = 'EnforceActivePatrolPointNfcUniqueness1781779000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_patrol_points_active_nfc_tag
        ON patrol_points(nfc_tag_id)
        WHERE nfc_tag_id IS NOT NULL
          AND is_active = TRUE
          AND deleted_at IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_patrol_points_active_nfc_tag;
    `);
  }
}
