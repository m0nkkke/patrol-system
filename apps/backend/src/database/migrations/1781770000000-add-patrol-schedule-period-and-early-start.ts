import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatrolSchedulePeriodAndEarlyStart1781770000000 implements MigrationInterface {
  name = 'AddPatrolSchedulePeriodAndEarlyStart1781770000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE patrol_period AS ENUM ('morning', 'noon', 'evening');

      ALTER TABLE patrol_schedules
        ADD COLUMN period patrol_period NOT NULL DEFAULT 'morning',
        ADD COLUMN early_start_minutes SMALLINT NOT NULL DEFAULT 0,
        ADD CONSTRAINT chk_patrol_schedules_early_start
          CHECK (early_start_minutes >= 0 AND early_start_minutes <= 1440);

      CREATE INDEX idx_patrol_schedules_period ON patrol_schedules(period);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_patrol_schedules_period;

      ALTER TABLE patrol_schedules
        DROP CONSTRAINT IF EXISTS chk_patrol_schedules_early_start,
        DROP COLUMN IF EXISTS early_start_minutes,
        DROP COLUMN IF EXISTS period;

      DROP TYPE IF EXISTS patrol_period;
    `);
  }
}
