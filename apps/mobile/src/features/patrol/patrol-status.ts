import type { PatrolStatus } from '@patrol/shared';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export function patrolStatusLabel(status: PatrolStatus): string {
  switch (status) {
    case 'in_progress':
      return 'Идёт';
    case 'completed':
      return 'Завершён';
    case 'overdue':
      return 'Просрочен';
    case 'cancelled':
      return 'Отменён';
    default:
      return 'Ожидает';
  }
}

export function patrolStatusTone(status: PatrolStatus): BadgeTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'overdue':
      return 'warning';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}
