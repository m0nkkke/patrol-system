import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRouteHistoryAndPatrolSnapshot1781782000000 implements MigrationInterface {
  name = 'AddRouteHistoryAndPatrolSnapshot1781782000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patrols ADD COLUMN route_snapshot JSONB;
      CREATE TABLE patrol_route_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES patrol_routes(id) ON DELETE RESTRICT,
        version INTEGER NOT NULL CHECK (version > 0),
        actor_id UUID,
        actor_full_name TEXT,
        authorization_id UUID,
        snapshot JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX uq_patrol_route_versions_route_version
        ON patrol_route_versions(route_id, version);
      INSERT INTO patrol_route_versions (route_id, version, snapshot)
      SELECT route.id, 1, jsonb_build_object(
        'name', route.name, 'category', route.category, 'isActive', route.is_active,
        'points', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'patrolPointId', point.patrol_point_id, 'sortOrder', point.sort_order,
          'dwellSeconds', point.dwell_seconds) ORDER BY point.sort_order)
          FROM patrol_route_points point WHERE point.route_id = route.id), '[]'::jsonb)
      ) FROM patrol_routes route;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE patrol_route_versions;
      ALTER TABLE patrols DROP COLUMN route_snapshot;
    `);
  }
}
