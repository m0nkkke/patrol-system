import { Injectable } from '@nestjs/common';
import { ManagementMetricsQueryDto } from '@patrol/shared';
import { DataSource } from 'typeorm';

type ManagementMetricsRaw = {
  attention_patrols: string | null;
  attention_shop_count: string | null;
  average_completion_seconds: string | null;
  clean_patrols: string | null;
  completed_patrols: string | null;
  green_shop_count: string | null;
  on_time_patrols: string | null;
  planned_patrols: string | null;
  submitted_reports: string | null;
};

@Injectable()
export class ManagementMetricsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getMetrics(query: ManagementMetricsQueryDto): Promise<ManagementMetricsRaw> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.shopId !== undefined) {
      params.push(query.shopId);
      conditions.push(`shop.id = $${params.length}`);
    }

    if (query.regionId !== undefined) {
      params.push(query.regionId);
      conditions.push(`shop.region_id = $${params.length}`);
    }

    const scopeWhere =
      conditions.length === 0
        ? 'shop.is_active = TRUE AND shop.deleted_at IS NULL'
        : `shop.is_active = TRUE AND shop.deleted_at IS NULL AND ${conditions.join(' AND ')}`;

    const periodConditions: string[] = [];
    const reportPeriodConditions: string[] = [];

    if (query.from !== undefined) {
      params.push(new Date(query.from));
      periodConditions.push(`patrol.created_at >= $${params.length}`);
      reportPeriodConditions.push(`report.created_at >= $${params.length}`);
    }

    if (query.to !== undefined) {
      params.push(new Date(query.to));
      periodConditions.push(`patrol.created_at <= $${params.length}`);
      reportPeriodConditions.push(`report.created_at <= $${params.length}`);
    }

    const patrolWhere =
      periodConditions.length === 0 ? '' : `WHERE ${periodConditions.join(' AND ')}`;
    const reportWhere =
      reportPeriodConditions.length === 0 ? '' : `WHERE ${reportPeriodConditions.join(' AND ')}`;

    const [raw] = await this.dataSource.query<ManagementMetricsRaw[]>(
      `
      WITH scoped_shops AS (
        SELECT shop.id
        FROM shops shop
        WHERE ${scopeWhere}
      ),
      patrol_scope AS (
        SELECT patrol.*
        FROM patrols patrol
        INNER JOIN scoped_shops scoped_shop ON scoped_shop.id = patrol.shop_id
        ${patrolWhere}
      ),
      incident_patrols AS (
        SELECT DISTINCT incident.patrol_id
        FROM patrol_incidents incident
        INNER JOIN patrol_scope patrol ON patrol.id = incident.patrol_id
      ),
      report_scope AS (
        SELECT report.*
        FROM patrol_reports report
        INNER JOIN scoped_shops scoped_shop ON scoped_shop.id = report.shop_id
        ${reportWhere}
      ),
      patrol_metrics AS (
        SELECT
          COUNT(*) FILTER (WHERE patrol.schedule_id IS NOT NULL) AS planned_patrols,
          COUNT(*) FILTER (WHERE patrol.status = 'completed') AS completed_patrols,
          COUNT(*) FILTER (
            WHERE patrol.status = 'completed'
              AND patrol.due_at IS NOT NULL
              AND patrol.completed_at <= patrol.due_at
          ) AS on_time_patrols,
          COUNT(*) FILTER (
            WHERE patrol.status = 'completed'
              AND incident_patrols.patrol_id IS NULL
          ) AS clean_patrols,
          COUNT(*) FILTER (
            WHERE patrol.status IN ('overdue', 'cancelled')
              OR incident_patrols.patrol_id IS NOT NULL
          ) AS attention_patrols,
          AVG(EXTRACT(EPOCH FROM (patrol.completed_at - patrol.started_at))) FILTER (
            WHERE patrol.status = 'completed'
              AND patrol.started_at IS NOT NULL
              AND patrol.completed_at IS NOT NULL
          ) AS average_completion_seconds
        FROM patrol_scope patrol
        LEFT JOIN incident_patrols ON incident_patrols.patrol_id = patrol.id
      ),
      shop_metrics AS (
        SELECT
          COUNT(*) FILTER (WHERE attention.shop_id IS NULL) AS green_shop_count,
          COUNT(*) FILTER (WHERE attention.shop_id IS NOT NULL) AS attention_shop_count
        FROM scoped_shops scoped_shop
        LEFT JOIN (
          SELECT DISTINCT patrol.shop_id
          FROM patrol_scope patrol
          LEFT JOIN incident_patrols ON incident_patrols.patrol_id = patrol.id
          WHERE patrol.status IN ('overdue', 'cancelled')
            OR incident_patrols.patrol_id IS NOT NULL
        ) attention ON attention.shop_id = scoped_shop.id
      ),
      report_metrics AS (
        SELECT COUNT(*) FILTER (WHERE report.status = 'submitted') AS submitted_reports
        FROM report_scope report
      )
      SELECT *
      FROM patrol_metrics, shop_metrics, report_metrics
      `,
      params,
    );

    return raw ?? {
      attention_patrols: '0',
      attention_shop_count: '0',
      average_completion_seconds: null,
      clean_patrols: '0',
      completed_patrols: '0',
      green_shop_count: '0',
      on_time_patrols: '0',
      planned_patrols: '0',
      submitted_reports: '0',
    };
  }
}
