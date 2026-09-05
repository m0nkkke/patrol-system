import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoutePointDwellSeconds1781781000000 implements MigrationInterface {
  name = 'AddRoutePointDwellSeconds1781781000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrol_route_points
        ADD COLUMN dwell_seconds SMALLINT NOT NULL DEFAULT 90;

      ALTER TABLE patrol_route_points
        ADD CONSTRAINT chk_patrol_route_point_dwell_seconds
        CHECK (dwell_seconds BETWEEN 0 AND 120);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrol_route_points
        DROP CONSTRAINT IF EXISTS chk_patrol_route_point_dwell_seconds,
        DROP COLUMN IF EXISTS dwell_seconds;
    `);
  }
}
