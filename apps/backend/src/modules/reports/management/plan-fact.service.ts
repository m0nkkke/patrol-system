import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ManagementMetricsQueryDto, PlanFactCounts, PlanFactResponse } from '@patrol/shared';
import { DataSource } from 'typeorm';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';

type PlanRow = {
  shop_id: string;
  shop_name: string;
  date: string;
  planned: string;
  completed: string;
  unfinished: string;
  missed: string;
  upcoming: string;
};

@Injectable()
export class PlanFactService {
  private readonly logger = new Logger(PlanFactService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Interval('materialize-patrol-plan', 60_000)
  async materialize(): Promise<void> {
    try {
      // Reports also materialize their requested range, recovering gaps after downtime.
      await this.dataSource.query(`SELECT patrol_materialize_plan(now() - interval '2 days', now() + interval '1 day')`);
    } catch (error) {
      this.logger.error('Failed to materialize patrol plan', error instanceof Error ? error.stack : String(error));
    }
  }

  async getReport(query: ManagementMetricsQueryDto, actor: AuthenticatedUser, now = new Date()): Promise<PlanFactResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError('PLAN_FACT_FORBIDDEN', 'User cannot access management plan/fact');
    }
    const to = query.to === undefined ? now : new Date(query.to);
    const from = query.from === undefined ? new Date(to.getTime() - 30 * 86_400_000) : new Date(query.from);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to ||
      to.getTime() - from.getTime() > 366 * 86_400_000 || to.getTime() > now.getTime() + 31 * 86_400_000) {
      throw new DomainValidationError('PLAN_FACT_INVALID_PERIOD', 'Choose a period of at most 366 days, ending no more than 31 days ahead');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT patrol_materialize_plan($1::timestamptz, $2::timestamptz)', [from, to]);
      const [coverage] = await manager.query<Array<{ started_at: Date }>>('SELECT started_at FROM patrol_plan_coverage');
      const rows = await manager.query<PlanRow[]>(`
        SELECT o.shop_id, (array_agg(o.shop_name ORDER BY o.planned_start_at DESC))[1] AS shop_name,
          to_char(o.planned_start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          count(*) AS planned,
          count(*) FILTER (WHERE facts.completed) AS completed,
          count(*) FILTER (WHERE NOT facts.completed AND facts.started) AS unfinished,
          count(*) FILTER (WHERE NOT facts.started AND o.due_at <= $3) AS missed,
          count(*) FILTER (WHERE NOT facts.started AND o.due_at > $3) AS upcoming
        FROM patrol_plan_occurrences o
        CROSS JOIN LATERAL (SELECT
          COALESCE(bool_or(p.status = 'completed'), FALSE) AS completed,
          COALESCE(bool_or(p.started_at IS NOT NULL OR p.status IN ('in_progress', 'overdue', 'completed', 'cancelled')), FALSE) AS started
          FROM patrols p WHERE p.planned_occurrence_id = o.id) facts
        WHERE o.planned_start_at >= $1 AND o.planned_start_at <= $2
          AND ($4::uuid IS NULL OR o.shop_id = $4)
          AND ($5::uuid IS NULL OR o.region_id = $5)
        GROUP BY o.shop_id, date ORDER BY date, o.shop_id
      `, [from, to, now, query.shopId ?? null, query.regionId ?? null]);
      const [unscheduled] = await manager.query<Array<{ count: string }>>(`
        SELECT count(*) FROM patrols p JOIN shops s ON s.id = p.shop_id
        WHERE p.schedule_id IS NULL AND p.created_at >= $1 AND p.created_at <= $2
          AND ($3::uuid IS NULL OR p.shop_id = $3) AND ($4::uuid IS NULL OR s.region_id = $4)
      `, [from, to, query.shopId ?? null, query.regionId ?? null]);
      const totals = emptyCounts();
      const shops = new Map<string, PlanFactResponse['shops'][number]>();
      const days = new Map<string, PlanFactResponse['days'][number]>();
      for (const row of rows) {
        const shop = shops.get(row.shop_id) ?? { ...emptyCounts(), shopId: row.shop_id, shopName: row.shop_name };
        shop.shopName = row.shop_name;
        const day = days.get(row.date) ?? { ...emptyCounts(), date: row.date };
        for (const counts of [totals, shop, day]) addCounts(counts, row);
        shops.set(row.shop_id, shop);
        days.set(row.date, day);
      }
      return {
        from: from.toISOString(), to: to.toISOString(), generatedAt: now.toISOString(),
        coverageStartedAt: coverage!.started_at.toISOString(),
        partialHistory: from < coverage!.started_at,
        totals, unscheduledPatrols: Number(unscheduled!.count),
        shops: [...shops.values()], days: [...days.values()],
      };
    });
  }
}

function emptyCounts(): PlanFactCounts {
  return { planned: 0, completed: 0, unfinished: 0, missed: 0, upcoming: 0, completionRate: null };
}

function addCounts(target: PlanFactCounts, row: PlanRow): void {
  for (const key of ['planned', 'completed', 'unfinished', 'missed', 'upcoming'] as const) target[key] += Number(row[key]);
  target.completionRate = target.planned === 0 ? null : Number((target.completed / target.planned).toFixed(4));
}
