import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchedulePlanHistory1781783000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE patrol_plan_coverage (
        singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
        started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      );
      INSERT INTO patrol_plan_coverage DEFAULT VALUES;
      CREATE TABLE patrol_schedule_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id UUID NOT NULL REFERENCES patrol_schedules(id) ON DELETE RESTRICT,
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        snapshot JSONB NOT NULL
      );
      CREATE UNIQUE INDEX uq_schedule_current_version ON patrol_schedule_versions(schedule_id)
        WHERE valid_to IS NULL;
      CREATE TABLE patrol_plan_occurrences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version_id UUID NOT NULL REFERENCES patrol_schedule_versions(id) ON DELETE RESTRICT,
        schedule_id UUID NOT NULL REFERENCES patrol_schedules(id) ON DELETE RESTRICT,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
        region_id UUID,
        shop_name TEXT NOT NULL,
        schedule_name TEXT NOT NULL,
        timezone TEXT NOT NULL,
        local_date DATE NOT NULL,
        planned_start_at TIMESTAMPTZ NOT NULL,
        available_from TIMESTAMPTZ NOT NULL,
        due_at TIMESTAMPTZ NOT NULL,
        UNIQUE(version_id, local_date)
      );
      CREATE INDEX idx_plan_period ON patrol_plan_occurrences(planned_start_at, shop_id);
      CREATE INDEX idx_plan_schedule_due ON patrol_plan_occurrences(schedule_id, due_at);
      ALTER TABLE patrols ADD COLUMN planned_occurrence_id UUID
        REFERENCES patrol_plan_occurrences(id) ON DELETE RESTRICT;
      CREATE INDEX idx_patrol_plan_occurrence ON patrols(planned_occurrence_id);

      CREATE FUNCTION patrol_capture_schedule(target UUID) RETURNS VOID LANGUAGE plpgsql AS $$
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

      CREATE FUNCTION patrol_schedule_window_open(target UUID) RETURNS BOOLEAN LANGUAGE sql AS $$
        SELECT COALESCE(bool_or(s.is_active
          AND EXTRACT(ISODOW FROM clock_timestamp() AT TIME ZONE shop.timezone)::int = ANY(s.weekdays)
          AND (clock_timestamp() AT TIME ZONE shop.timezone)::time >=
            CASE WHEN s.early_start_minutes * 60 >= EXTRACT(EPOCH FROM s.start_time)
              THEN time '00:00' ELSE s.start_time - make_interval(mins => s.early_start_minutes) END
          AND (clock_timestamp() AT TIME ZONE shop.timezone)::time < s.end_time), FALSE)
        FROM patrol_schedules s JOIN shops shop ON shop.id = s.shop_id WHERE s.id = target
      $$;
      CREATE FUNCTION patrol_schedule_history_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(1781783000);
        IF TG_WHEN = 'BEFORE' THEN
          IF (to_jsonb(OLD) - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at')
            AND patrol_schedule_window_open(OLD.id) THEN
            RAISE EXCEPTION 'PATROL_SCHEDULE_WINDOW_OPEN' USING ERRCODE = 'P0001';
          END IF;
        ELSE
          PERFORM patrol_capture_schedule(NEW.id);
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER patrol_schedule_guard BEFORE UPDATE ON patrol_schedules
        FOR EACH ROW EXECUTE FUNCTION patrol_schedule_history_trigger();
      CREATE TRIGGER patrol_schedule_history AFTER INSERT OR UPDATE ON patrol_schedules
        FOR EACH ROW EXECUTE FUNCTION patrol_schedule_history_trigger();

      CREATE FUNCTION patrol_shop_history_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE target UUID;
      BEGIN
        PERFORM pg_advisory_xact_lock(1781783000);
        FOR target IN SELECT id FROM patrol_schedules WHERE shop_id = NEW.id LOOP
          IF TG_WHEN = 'BEFORE' THEN
            IF OLD.timezone IS DISTINCT FROM NEW.timezone AND patrol_schedule_window_open(target) THEN
              RAISE EXCEPTION 'PATROL_SCHEDULE_WINDOW_OPEN' USING ERRCODE = 'P0001';
            END IF;
          ELSE
            PERFORM patrol_capture_schedule(target);
          END IF;
        END LOOP;
        RETURN NEW;
      END $$;
      CREATE TRIGGER patrol_shop_plan_guard BEFORE UPDATE OF timezone ON shops
        FOR EACH ROW EXECUTE FUNCTION patrol_shop_history_trigger();
      CREATE TRIGGER patrol_shop_plan_history AFTER UPDATE OF timezone, name, region_id, is_active, deleted_at ON shops
        FOR EACH ROW EXECUTE FUNCTION patrol_shop_history_trigger();
      CREATE FUNCTION patrol_route_plan_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE target UUID;
      BEGIN
        PERFORM pg_advisory_xact_lock(1781783000);
        FOR target IN SELECT id FROM patrol_schedules WHERE route_id = NEW.id LOOP
          PERFORM patrol_capture_schedule(target);
        END LOOP;
        RETURN NEW;
      END $$;
      CREATE TRIGGER patrol_route_plan_history AFTER UPDATE OF is_active ON patrol_routes
        FOR EACH ROW EXECUTE FUNCTION patrol_route_plan_trigger();

      CREATE FUNCTION patrol_materialize_plan(range_from TIMESTAMPTZ, range_to TIMESTAMPTZ)
      RETURNS VOID LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(1781783000);
        INSERT INTO patrol_plan_occurrences(version_id, schedule_id, shop_id, region_id,
          shop_name, schedule_name, timezone, local_date, planned_start_at, available_from, due_at)
        SELECT v.id, v.schedule_id, (v.snapshot->>'shop_id')::uuid,
          (v.snapshot->>'region_id')::uuid, v.snapshot->>'shop_name', v.snapshot->>'name',
          v.snapshot->>'timezone', d.day::date, times.start_at, times.available_at, times.end_at
        FROM patrol_schedule_versions v
        CROSS JOIN LATERAL generate_series(
          (GREATEST(range_from, v.valid_from) AT TIME ZONE (v.snapshot->>'timezone'))::date::timestamp,
          (LEAST(range_to, COALESCE(v.valid_to, range_to)) AT TIME ZONE (v.snapshot->>'timezone'))::date::timestamp,
          interval '1 day') d(day)
        CROSS JOIN LATERAL (SELECT
          (d.day::date + (v.snapshot->>'start_time')::time) AT TIME ZONE (v.snapshot->>'timezone') AS start_at,
          (d.day::date + CASE WHEN (v.snapshot->>'early_start_minutes')::int * 60 >=
            EXTRACT(EPOCH FROM (v.snapshot->>'start_time')::time) THEN time '00:00'
            ELSE (v.snapshot->>'start_time')::time - make_interval(mins => (v.snapshot->>'early_start_minutes')::int) END)
            AT TIME ZONE (v.snapshot->>'timezone') AS available_at,
          (d.day::date + (v.snapshot->>'end_time')::time) AT TIME ZONE (v.snapshot->>'timezone') AS end_at
        ) times
        WHERE (v.snapshot->>'enabled')::boolean
          AND v.valid_from <= range_to AND (v.valid_to IS NULL OR v.valid_to >= range_from)
          AND v.snapshot->'weekdays' @> to_jsonb(EXTRACT(ISODOW FROM d.day)::int)
          AND times.available_at >= v.valid_from
          AND (v.valid_to IS NULL OR times.available_at < v.valid_to)
          AND times.start_at >= range_from AND times.start_at <= range_to
        ON CONFLICT (version_id, local_date) DO NOTHING;
      END $$;

      CREATE FUNCTION patrol_link_plan_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.schedule_id IS NOT NULL AND NEW.due_at IS NOT NULL AND NEW.planned_occurrence_id IS NULL THEN
          PERFORM patrol_materialize_plan(NEW.due_at - interval '1 day', NEW.due_at);
          SELECT o.id INTO NEW.planned_occurrence_id FROM patrol_plan_occurrences o
          WHERE o.schedule_id = NEW.schedule_id AND o.due_at = NEW.due_at
            AND o.shop_id = NEW.shop_id
          ORDER BY o.available_from DESC LIMIT 1;
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER patrol_link_plan BEFORE INSERT OR UPDATE OF schedule_id, due_at ON patrols
        FOR EACH ROW EXECUTE FUNCTION patrol_link_plan_trigger();
      SELECT patrol_capture_schedule(id) FROM patrol_schedules;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER patrol_link_plan ON patrols;
      DROP FUNCTION patrol_link_plan_trigger();
      DROP TRIGGER patrol_route_plan_history ON patrol_routes;
      DROP FUNCTION patrol_route_plan_trigger();
      DROP TRIGGER patrol_shop_plan_history ON shops;
      DROP TRIGGER patrol_shop_plan_guard ON shops;
      DROP FUNCTION patrol_shop_history_trigger();
      DROP TRIGGER patrol_schedule_history ON patrol_schedules;
      DROP TRIGGER patrol_schedule_guard ON patrol_schedules;
      DROP FUNCTION patrol_schedule_history_trigger();
      DROP FUNCTION patrol_schedule_window_open(UUID);
      DROP FUNCTION patrol_capture_schedule(UUID);
      DROP FUNCTION patrol_materialize_plan(TIMESTAMPTZ, TIMESTAMPTZ);
      ALTER TABLE patrols DROP COLUMN planned_occurrence_id;
      DROP TABLE patrol_plan_occurrences;
      DROP TABLE patrol_schedule_versions;
      DROP TABLE patrol_plan_coverage;
    `);
  }
}
