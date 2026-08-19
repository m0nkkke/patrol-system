import { Injectable } from '@nestjs/common';
import { ManagementTrendsQueryDto } from '@patrol/shared';
import { DataSource } from 'typeorm';

export type ManagementTrendBucket = 'day' | 'month' | 'week';

export type ManagementTrendRaw = {
  attention_patrols: string | null;
  average_completion_seconds: string | null;
  bucket_start: Date | string;
  clean_patrols: string | null;
  completed_patrols: string | null;
  on_time_patrols: string | null;
  planned_patrols: string | null;
  submitted_reports: string | null;
};

@Injectable()
export class ManagementTrendsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findTrends(
    query: ManagementTrendsQueryDto,
    bucket: ManagementTrendBucket,
  ): Promise<ManagementTrendRaw[]> {
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
    const bucketSql = toDateTruncBucket(bucket);

    return this.dataSource.query<ManagementTrendRaw[]>(
      `
      WITH scoped_shops AS (
        SELECT shop.id
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
          date_trunc('${bucketSql}', patrol.created_at) AS bucket_start,
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
        GROUP BY date_trunc('${bucketSql}', patrol.created_at)
      ),
      report_metrics AS (
        SELECT
          date_trunc('${bucketSql}', report.created_at) AS bucket_start,
          COUNT(*) FILTER (WHERE report.status = 'submitted') AS submitted_reports
        FROM report_scope report
        GROUP BY date_trunc('${bucketSql}', report.created_at)
      )
      SELECT
        COALESCE(patrol_metrics.bucket_start, report_metrics.bucket_start) AS bucket_start,
        COALESCE(patrol_metrics.planned_patrols, 0) AS planned_patrols,
        COALESCE(patrol_metrics.completed_patrols, 0) AS completed_patrols,
        COALESCE(patrol_metrics.on_time_patrols, 0) AS on_time_patrols,
        COALESCE(patrol_metrics.clean_patrols, 0) AS clean_patrols,
        COALESCE(patrol_metrics.attention_patrols, 0) AS attention_patrols,
        patrol_metrics.average_completion_seconds,
        COALESCE(report_metrics.submitted_reports, 0) AS submitted_reports
      FROM patrol_metrics
      FULL OUTER JOIN report_metrics ON report_metrics.bucket_start = patrol_metrics.bucket_start
      ORDER BY bucket_start ASC
      `,
      params,
    );
  }
}

function toDateTruncBucket(bucket: ManagementTrendBucket): string {
  const buckets: Record<ManagementTrendBucket, string> = {
    day: 'day',
    month: 'month',
    week: 'week',
  };

  return buckets[bucket];
}
