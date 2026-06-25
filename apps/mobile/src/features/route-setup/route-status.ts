import type { RouteStatus } from '@patrol/shared';

type BadgeTone = 'neutral' | 'success' | 'warning';

export function routeStatusLabel(status: RouteStatus): string {
  switch (status) {
    case 'ready':
      return 'Готов';
    case 'setup_in_progress':
      return 'Настраивается';
    default:
      return 'Не настроен';
  }
}

export function routeStatusTone(status: RouteStatus): BadgeTone {
  switch (status) {
    case 'ready':
      return 'success';
    case 'setup_in_progress':
      return 'warning';
    default:
      return 'neutral';
  }
}
