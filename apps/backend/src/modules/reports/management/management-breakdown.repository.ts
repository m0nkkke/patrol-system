import { Injectable } from '@nestjs/common';
import { ManagementBreakdownQueryDto } from '@patrol/shared';
import { DataSource } from 'typeorm';

export type ManagementBreakdownGroupBy = 'period' | 'routeCategory';

export type ManagementBreakdownRaw = {
  attention_patrols: string | null;
  average_completion_seconds: string | null;
  clean_patrols: string | null;
  completed_patrols: string | null;
  group_key: string;
  on_time_patrols: string | null;
  registered_patrols: string | null;
  submitted_reports: string | null;
};

@Injectable()
export class ManagementBreakdownRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findBreakdown(
    query: ManagementBreakdownQueryDto,
    groupBy: ManagementBreakdownGroupBy,
  ): Promise<ManagementBreakdownRaw[]> {
    const params: unknown[] = [];
    const scopeConditions = ['shop.is_active = TRUE', 'shop.deleted_at IS NULL'];

    if (query.shopId !== undefined) {
      params.push(query.shopId);
      scopeConditions.push(`shop.id = $${params.length}`);
    }

    if (query.regionId !== undefined) {
      params.push(query.regionId);
      scopeConditions.push(`shop.region_id = $${params.length}`);
    }

    const patrolPeriodConditions: string[] = [];
    const reportPeriodConditions: string[] = [];

    if (query.from !== undefined) {
      params.push(new Date(query.from));
      patrolPeriodConditions.push(`patrol.created_at >= $${params.length}`);
      reportPeriodConditions.push(`report.created_at >= $${params.length}`);
    }

    if (query.to !== undefined) {
      params.push(new Date(query.to));
      patrolPeriodConditions.push(`patrol.created_at <= $${params.length}`);
      reportPeriodConditions.push(`report.created_at <= $${params.length}`);
    }

    const patrolWhere =
      patrolPeriodConditions.length === 0
        ? ''
        : `WHERE ${patrolPeriodConditions.join(' AND ')}`;
    const reportWhere =
      reportPeriodConditions.length === 0
        ? ''
        : `WHERE ${reportPeriodConditions.join(' AND ')}`;
    const groupSql = toGroupSql(groupBy);

    return this.dataSource.query<ManagementBreakdownRaw[]>(
      `
      WITH scoped_shops AS (
        SELECT shop.id
        FROM shops shop
        WHERE ${scopeConditions.join(' AND ')}
      ),
      patrol_scope AS (
        SELECT
          patrol.*,
          ${groupSql.patrol} AS group_key
        FROM patrols patrol
        INNER JOIN scoped_shops scoped_shop ON scoped_shop.id = patrol.shop_id
        LEFT JOIN patrol_routes route ON route.id = patrol.route_id
        LEFT JOIN patrol_schedules schedule ON schedule.id = patrol.schedule_id
        LEFT JOIN patrol_routes schedule_route ON schedule_route.id = schedule.route_id
        ${patrolWhere}
      ),
      incident_patrols AS (
        SELECT DISTINCT incident.patrol_id
        FROM patrol_incidents incident
        INNER JOIN patrol_scope patrol ON patrol.id = incident.patrol_id
      ),
      report_scope AS (
        SELECT
          report.*,
          ${groupSql.report} AS group_key
        FROM patrol_reports report
        INNER JOIN scoped_shops scoped_shop ON scoped_shop.id = report.shop_id
        LEFT JOIN patrol_routes route ON route.id = report.route_id
        LEFT JOIN patrols patrol ON patrol.id = report.patrol_id
        LEFT JOIN patrol_routes patrol_route ON patrol_route.id = patrol.route_id
        LEFT JOIN patrol_schedules schedule ON schedule.id = report.schedule_id
        LEFT JOIN patrol_schedules patrol_schedule ON patrol_schedule.id = patrol.schedule_id
        LEFT JOIN patrol_routes schedule_route ON schedule_route.id = schedule.route_id
        ${reportWhere}
      ),
      patrol_metrics AS (
        SELECT
          patrol.group_key,
          COUNT(*) AS registered_patrols,
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
        WHERE patrol.group_key IS NOT NULL
        GROUP BY patrol.group_key
      ),
      report_metrics AS (
        SELECT
          report.group_key,
          COUNT(*) FILTER (WHERE report.status = 'submitted') AS submitted_reports
        FROM report_scope report
        WHERE report.group_key IS NOT NULL
        GROUP BY report.group_key
      )
      SELECT
        COALESCE(patrol_metrics.group_key, report_metrics.group_key) AS group_key,
        COALESCE(patrol_metrics.registered_patrols, 0) AS registered_patrols,
        COALESCE(patrol_metrics.completed_patrols, 0) AS completed_patrols,
        COALESCE(patrol_metrics.on_time_patrols, 0) AS on_time_patrols,
        COALESCE(patrol_metrics.clean_patrols, 0) AS clean_patrols,
        COALESCE(patrol_metrics.attention_patrols, 0) AS attention_patrols,
        patrol_metrics.average_completion_seconds,
        COALESCE(report_metrics.submitted_reports, 0) AS submitted_reports
      FROM patrol_metrics
      FULL OUTER JOIN report_metrics ON report_metrics.group_key = patrol_metrics.group_key
      ORDER BY group_key ASC
      `,
      params,
    );
  }
}

function toGroupSql(groupBy: ManagementBreakdownGroupBy): { patrol: string; report: string } {
  const groups: Record<ManagementBreakdownGroupBy, { patrol: string; report: string }> = {
    period: {
      patrol: 'schedule.period::text',
      report: 'COALESCE(report.period::text, schedule.period::text, patrol_schedule.period::text)',
    },
    routeCategory: {
      patrol: 'COALESCE(route.category::text, schedule_route.category::text)',
      report: 'COALESCE(route.category::text, patrol_route.category::text, schedule_route.category::text)',
    },
  };

  return groups[groupBy];
}
