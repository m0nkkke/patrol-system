import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteRoutesAndSchedules1781786000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrol_schedules ADD COLUMN deleted_at TIMESTAMPTZ;
      CREATE INDEX idx_patrol_schedules_deleted_at ON patrol_schedules(deleted_at)
        WHERE deleted_at IS NULL;

      CREATE OR REPLACE FUNCTION patrol_capture_schedule(target UUID) RETURNS VOID LANGUAGE plpgsql AS $$
      DECLARE changed_at TIMESTAMPTZ;
      BEGIN
        PERFORM pg_advisory_xact_lock(1781783000);
        changed_at := clock_timestamp();
        UPDATE patrol_schedule_versions SET valid_to = changed_at
          WHERE schedule_id = target AND valid_to IS NULL;
        DELETE FROM patrol_plan_occurrences o WHERE o.schedule_id = target
          AND o.available_from > changed_at
          AND NOT EXISTS (SELECT 1 FROM patrols p WHERE p.planned_occurrence_id = o.id);
        INSERT INTO patrol_schedule_versions(schedule_id, valid_from, snapshot)
        SELECT s.id, changed_at, to_jsonb(s) || jsonb_build_object(
          'timezone', shop.timezone, 'shop_name', shop.name, 'region_id', shop.region_id,
          'enabled', s.is_active AND s.deleted_at IS NULL
            AND shop.is_active AND shop.deleted_at IS NULL
            AND (s.route_id IS NULL OR (COALESCE(route.is_active, FALSE) AND route.deleted_at IS NULL)))
        FROM patrol_schedules s JOIN shops shop ON shop.id = s.shop_id
        LEFT JOIN patrol_routes route ON route.id = s.route_id WHERE s.id = target;
      END $$;

      DROP TRIGGER patrol_route_plan_history ON patrol_routes;
      CREATE TRIGGER patrol_route_plan_history AFTER UPDATE OF is_active, deleted_at ON patrol_routes
        FOR EACH ROW EXECUTE FUNCTION patrol_route_plan_trigger();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER patrol_route_plan_history ON patrol_routes;
      CREATE TRIGGER patrol_route_plan_history AFTER UPDATE OF is_active ON patrol_routes
        FOR EACH ROW EXECUTE FUNCTION patrol_route_plan_trigger();

      CREATE OR REPLACE FUNCTION patrol_capture_schedule(target UUID) RETURNS VOID LANGUAGE plpgsql AS $$
      DECLARE changed_at TIMESTAMPTZ;
      BEGIN
        PERFORM pg_advisory_xact_lock(1781783000);
        changed_at := clock_timestamp();
        UPDATE patrol_schedule_versions SET valid_to = changed_at
          WHERE schedule_id = target AND valid_to IS NULL;
        DELETE FROM patrol_plan_occurrences o WHERE o.schedule_id = target
          AND o.available_from > changed_at
          AND NOT EXISTS (SELECT 1 FROM patrols p WHERE p.planned_occurrence_id = o.id);
        INSERT INTO patrol_schedule_versions(schedule_id, valid_from, snapshot)
        SELECT s.id, changed_at, to_jsonb(s) || jsonb_build_object(
          'timezone', shop.timezone, 'shop_name', shop.name, 'region_id', shop.region_id,
          'enabled', s.is_active AND shop.is_active AND shop.deleted_at IS NULL
            AND (s.route_id IS NULL OR COALESCE(route.is_active, FALSE)))
        FROM patrol_schedules s JOIN shops shop ON shop.id = s.shop_id
        LEFT JOIN patrol_routes route ON route.id = s.route_id WHERE s.id = target;
      END $$;

      DROP INDEX idx_patrol_schedules_deleted_at;
      ALTER TABLE patrol_schedules DROP COLUMN deleted_at;
    `);
  }
}
