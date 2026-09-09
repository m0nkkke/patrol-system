import type { AlertSeverity, PatrolIncident, PatrolIncidentType } from '@patrol/shared';

import type { ControlIncident } from '@/api/control-incidents.api';
import { formatSeconds } from '@/lib/format';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

type ControlIncidentDescriptionInput = Pick<
  ControlIncident,
  'actualSeconds' | 'expectedSeconds' | 'message' | 'type'
> &
  Partial<Pick<ControlIncident, 'fromPatrolPoint' | 'toPatrolPoint'>>;

export function incidentDescription(incident: PatrolIncident): string {
  const actual = formatSeconds(incident.actualSeconds);
  const expected = formatSeconds(incident.expectedSeconds);
  switch (incident.type) {
    case 'short_interval':
      return `Слишком короткий интервал: ${actual} (эталон ${expected})`;
    case 'long_interval':
      return `Слишком долгий интервал: ${actual} (эталон ${expected})`;
    default:
      return incident.message;
  }
}

export function incidentTypeLabel(type: PatrolIncidentType): string {
  switch (type) {
    case 'short_interval':
      return 'Короткий интервал';
    case 'long_interval':
      return 'Длинный интервал';
    case 'missed_point':
      return 'Пропуск точки';
    case 'patrol_overdue':
      return 'Обход просрочен';
    case 'point_dwell_too_short':
      return 'Короткое пребывание';
    case 'route_suspiciously_fast':
      return 'Подозрительно быстро';
    case 'route_too_fast':
      return 'Маршрут пройден быстро';
    case 'route_too_slow':
      return 'Маршрут пройден долго';
    case 'schedule_deviation':
      return 'Отклонение от графика';
    default:
      return type;
  }
}

export function incidentTypeTone(type: PatrolIncidentType): BadgeTone {
  return type === 'missed_point' ||
    type === 'patrol_overdue' ||
    type === 'route_suspiciously_fast'
    ? 'danger'
    : 'warning';
}

export function incidentTypeIcon(
  type: PatrolIncidentType,
): 'alarm-outline' | 'calendar-outline' | 'footsteps-outline' | 'timer-outline' {
  switch (type) {
    case 'missed_point':
      return 'footsteps-outline';
    case 'patrol_overdue':
      return 'alarm-outline';
    case 'schedule_deviation':
      return 'calendar-outline';
    default:
      return 'timer-outline';
  }
}

export function controlIncidentDescription(incident: ControlIncidentDescriptionInput): string {
  const actual = formatSeconds(incident.actualSeconds ?? undefined);
  const expected = formatSeconds(incident.expectedSeconds ?? undefined);
  const point = incident.fromPatrolPoint ?? incident.toPatrolPoint;

  switch (incident.type) {
    case 'short_interval':
      return `Слишком короткий интервал между точками: ${actual} при нормативе ${expected}.`;
    case 'long_interval':
      return `Слишком длинный интервал между точками: ${actual} при нормативе ${expected}.`;
    case 'missed_point':
      return incident.fromPatrolPoint && incident.toPatrolPoint
        ? `Нарушен порядок прохождения между точками «${incident.fromPatrolPoint.name}» и «${incident.toPatrolPoint.name}».`
        : 'Обнаружена попытка пропустить контрольную точку маршрута.';
    case 'patrol_overdue':
      return 'Обход не завершён до окончания допустимого временного окна.';
    case 'point_dwell_too_short':
      return `${point ? `На точке «${point.name}» ` : ''}время пребывания меньше допустимого: ${actual} при нормативе ${expected}.`;
    case 'route_suspiciously_fast':
      return `Маршрут пройден подозрительно быстро: ${actual} при нормативе ${expected}.`;
    case 'route_too_fast':
      return `Маршрут пройден слишком быстро: ${actual} при нормативе ${expected}.`;
    case 'route_too_slow':
      return `Маршрут пройден слишком медленно: ${actual} при нормативе ${expected}.`;
    case 'schedule_deviation':
      return 'Обход выполнен с отклонением от установленного расписания.';
    default:
      return incident.message;
  }
}

export function incidentSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Критическое';
    case 'warning':
      return 'Предупреждение';
    default:
      return 'Информация';
  }
}

export function incidentSeverityTone(severity: AlertSeverity): BadgeTone {
  return severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'neutral';
}
