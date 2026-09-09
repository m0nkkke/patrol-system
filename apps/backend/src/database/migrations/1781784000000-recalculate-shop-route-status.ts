import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecalculateShopRouteStatus1781784000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE shops shop
      SET route_status = CASE
        WHEN (
          shop.route_expected_points > 0
          AND shop.route_registered_points >= shop.route_expected_points
        ) OR EXISTS (
          SELECT 1
          FROM patrol_routes route
          WHERE route.shop_id = shop.id
            AND route.is_active = TRUE
            AND route.deleted_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM patrol_route_points route_point
              WHERE route_point.route_id = route.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM patrol_route_points route_point
              INNER JOIN patrol_points point ON point.id = route_point.patrol_point_id
              WHERE route_point.route_id = route.id
                AND (
                  point.is_active = FALSE
                  OR point.deleted_at IS NOT NULL
                  OR point.nfc_tag_id IS NULL
                )
            )
        ) THEN 'ready'
        WHEN shop.route_expected_points > 0 OR EXISTS (
          SELECT 1
          FROM patrol_routes route
          WHERE route.shop_id = shop.id
            AND route.is_active = TRUE
            AND route.deleted_at IS NULL
        ) THEN 'setup_in_progress'
        ELSE 'not_configured'
      END
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE shops
      SET route_status = CASE
        WHEN route_expected_points = 0 THEN 'not_configured'
        WHEN route_registered_points >= route_expected_points THEN 'ready'
        ELSE 'setup_in_progress'
      END
    `);
  }
}
