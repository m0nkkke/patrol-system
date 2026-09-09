type IncidentDescriptionInput = {
  actualSeconds: number | null;
  expectedSeconds: number | null;
  message: string;
  type: string;
};

export function incidentDescription(incident: IncidentDescriptionInput): string {
  const actual = formatDuration(incident.actualSeconds);
  const expected = formatDuration(incident.expectedSeconds);

  switch (incident.type) {
    case 'short_interval':
      return `Слишком короткий интервал между точками: ${actual} при нормативе ${expected}.`;
    case 'long_interval':
      return `Слишком длинный интервал между точками: ${actual} при нормативе ${expected}.`;
    case 'missed_point':
      return 'Нарушен порядок прохождения контрольных точек маршрута.';
    case 'patrol_overdue':
      return 'Обход не завершён до окончания допустимого временного окна.';
    case 'point_dwell_too_short':
      return `Время пребывания на точке меньше допустимого: ${actual} при нормативе ${expected}.`;
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

function formatDuration(value: number | null): string {
  if (value === null) return 'не указано';

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return minutes > 0 ? `${minutes} мин ${seconds} сек` : `${seconds} сек`;
}
