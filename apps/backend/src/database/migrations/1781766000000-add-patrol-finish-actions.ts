import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatrolFinishActions1781766000000 implements MigrationInterface {
  name = 'AddPatrolFinishActions1781766000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrols
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS completion_report TEXT,
        ADD COLUMN IF NOT EXISTS cancellation_reason TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrols
        DROP COLUMN IF EXISTS cancellation_reason,
        DROP COLUMN IF EXISTS completion_report,
        DROP COLUMN IF EXISTS cancelled_at
    `);
  }
}
