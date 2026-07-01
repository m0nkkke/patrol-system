import type { PatrolStatus } from '@patrol/shared';

import type { SheetButtonOption } from '@/ui';

export type PatrolStatusFilter = PatrolStatus | 'all';

export const PATROL_STATUS_OPTIONS: { value: PatrolStatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'completed', label: 'Завершён' },
  { value: 'overdue', label: 'Просрочен' },
  { value: 'cancelled', label: 'Отменён' },
  { value: 'in_progress', label: 'Идёт' },
];

export const PATROL_SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'startedAt:desc', label: 'Сначала новые' },
  { value: 'startedAt:asc', label: 'Сначала старые' },
];
