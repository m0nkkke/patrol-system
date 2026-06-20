import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfflineSyncFieldsToPatrolEvents1781763000000 implements MigrationInterface {
  name = 'AddOfflineSyncFieldsToPatrolEvents1781763000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrol_events
        ADD COLUMN IF NOT EXISTS client_local_id UUID,
        ADD COLUMN IF NOT EXISTS point_deactivated_after_scan BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS late_sync BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_patrol_events_client_local_id
        ON patrol_events(client_local_id) WHERE client_local_id IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_patrol_events_client_local_id;
      ALTER TABLE patrol_events
        DROP COLUMN IF EXISTS late_sync,
        DROP COLUMN IF EXISTS point_deactivated_after_scan,
        DROP COLUMN IF EXISTS client_local_id;
    `);
  }
}
