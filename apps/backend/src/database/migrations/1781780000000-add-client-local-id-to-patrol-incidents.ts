import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientLocalIdToPatrolIncidents1781780000000 implements MigrationInterface {
  name = 'AddClientLocalIdToPatrolIncidents1781780000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrol_incidents
        ADD COLUMN IF NOT EXISTS client_local_id UUID;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_patrol_incidents_patrol_client_local_id
        ON patrol_incidents(patrol_id, client_local_id)
        WHERE client_local_id IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_patrol_incidents_patrol_client_local_id;
    `);
    await queryRunner.query(`
      ALTER TABLE patrol_incidents
        DROP COLUMN IF EXISTS client_local_id;
    `);
  }
}
