import { Injectable } from '@nestjs/common';
import { ManagementScorecardsQueryDto } from '@patrol/shared';
import { DataSource } from 'typeorm';

export type ManagementScorecardRaw = {
  attention_patrols: string | null;
  average_completion_seconds: string | null;
  clean_patrols: string | null;
  completed_patrols: string | null;
  on_time_patrols: string | null;
  registered_patrols: string | null;
  region_id: string | null;
  shop_id: string;
  shop_name: string;
  submitted_reports: string | null;
  total_count: string;
};

type FindScorecardsResult = {
  items: ManagementScorecardRaw[];
  total: number;
};

@Injectable()
export class ManagementScorecardsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findScorecards(
    query: ManagementScorecardsQueryDto,
    options: { limit: number; offset: number; sort: ScorecardSort },
  ): Promise<FindScorecardsResult> {
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

    params.push(options.limit);
    const limitParam = params.length;
    params.push(options.offset);
    const offsetParam = params.length;

    const rows = await this.dataSource.query<ManagementScorecardRaw[]>(
      `
      WITH scoped_shops AS (
        SELECT shop.id, shop.name, shop.region_id
        FROM shops shop
        WHERE ${scopeConditions.join(' AND ')}
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
          patrol.shop_id,
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
        GROUP BY patrol.shop_id
      ),
      report_metrics AS (
        SELECT
          report.shop_id,
          COUNT(*) FILTER (WHERE report.status = 'submitted') AS submitted_reports
        FROM report_scope report
        GROUP BY report.shop_id
      ),
      scorecards AS (
        SELECT
          scoped_shop.id AS shop_id,
          scoped_shop.name AS shop_name,
          scoped_shop.region_id,
          COALESCE(patrol_metrics.registered_patrols, 0) AS registered_patrols,
          COALESCE(patrol_metrics.completed_patrols, 0) AS completed_patrols,
          COALESCE(patrol_metrics.on_time_patrols, 0) AS on_time_patrols,
          COALESCE(patrol_metrics.clean_patrols, 0) AS clean_patrols,
          COALESCE(patrol_metrics.attention_patrols, 0) AS attention_patrols,
          patrol_metrics.average_completion_seconds,
          COALESCE(report_metrics.submitted_reports, 0) AS submitted_reports
        FROM scoped_shops scoped_shop
        LEFT JOIN patrol_metrics ON patrol_metrics.shop_id = scoped_shop.id
        LEFT JOIN report_metrics ON report_metrics.shop_id = scoped_shop.id
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM scorecards
      ORDER BY ${toSqlSort(options.sort)}
      LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      params,
    );

    return {
      items: rows,
      total: Number(rows[0]?.total_count ?? 0),
    };
  }
}

export type ScorecardSort =
  | 'shopName:asc'
  | 'shopName:desc'
  | 'completionRate:asc'
  | 'completionRate:desc'
  | 'onTimeRate:asc'
  | 'onTimeRate:desc'
  | 'cleanPatrolRate:asc'
  | 'cleanPatrolRate:desc'
  | 'attentionRate:asc'
  | 'attentionRate:desc'
  | 'status:asc'
  | 'status:desc';

function toSqlSort(sort: ScorecardSort): string {
  const sorts: Record<ScorecardSort, string> = {
    'attentionRate:asc':
      'CASE WHEN registered_patrols = 0 THEN 0 ELSE attention_patrols::float / registered_patrols END ASC, shop_name ASC',
    'attentionRate:desc':
      'CASE WHEN registered_patrols = 0 THEN 0 ELSE attention_patrols::float / registered_patrols END DESC, shop_name ASC',
    'cleanPatrolRate:asc':
      'CASE WHEN completed_patrols = 0 THEN 0 ELSE clean_patrols::float / completed_patrols END ASC, shop_name ASC',
    'cleanPatrolRate:desc':
      'CASE WHEN completed_patrols = 0 THEN 0 ELSE clean_patrols::float / completed_patrols END DESC, shop_name ASC',
    'completionRate:asc':
      'CASE WHEN registered_patrols = 0 THEN 0 ELSE completed_patrols::float / registered_patrols END ASC, shop_name ASC',
    'completionRate:desc':
      'CASE WHEN registered_patrols = 0 THEN 0 ELSE completed_patrols::float / registered_patrols END DESC, shop_name ASC',
    'onTimeRate:asc':
      'CASE WHEN completed_patrols = 0 THEN 0 ELSE on_time_patrols::float / completed_patrols END ASC, shop_name ASC',
    'onTimeRate:desc':
      'CASE WHEN completed_patrols = 0 THEN 0 ELSE on_time_patrols::float / completed_patrols END DESC, shop_name ASC',
    'shopName:asc': 'shop_name ASC',
    'shopName:desc': 'shop_name DESC',
    'status:asc':
      'CASE WHEN attention_patrols > 0 OR (registered_patrols > 0 AND completed_patrols < registered_patrols) THEN 1 ELSE 0 END ASC, shop_name ASC',
    'status:desc':
      'CASE WHEN attention_patrols > 0 OR (registered_patrols > 0 AND completed_patrols < registered_patrols) THEN 1 ELSE 0 END DESC, shop_name ASC',
  };

  return sorts[sort] ?? sorts['shopName:asc'];
}
