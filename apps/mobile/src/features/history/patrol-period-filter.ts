import type { SheetButtonOption } from '@/ui';

export type PatrolPeriodFilter = 'all' | '7d' | '30d' | '90d';

export const PATROL_PERIOD_OPTIONS: SheetButtonOption<PatrolPeriodFilter>[] = [
  { value: 'all', label: 'За всё время' },
  { value: '7d', label: 'Последние 7 дней' },
  { value: '30d', label: 'Последние 30 дней' },
  { value: '90d', label: 'Последние 90 дней' },
];

const PERIOD_DAYS: Record<Exclude<PatrolPeriodFilter, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function patrolPeriodFrom(
  period: PatrolPeriodFilter,
  now: Date = new Date(),
): string | undefined {
  if (period === 'all') {
    return undefined;
  }

  const from = new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);
  return from.toISOString();
}
