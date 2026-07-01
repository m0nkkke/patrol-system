import type { PatrolIncident, PatrolIncidentType } from '@patrol/shared';

import { formatSeconds } from '@/lib/format';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

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
      return 'Слишком быстро';
    case 'long_interval':
      return 'Слишком долго';
    case 'missed_point':
      return 'Пропуск точки';
    default:
      return type;
  }
}

export function incidentTypeTone(type: PatrolIncidentType): BadgeTone {
  return type === 'missed_point' ? 'danger' : 'warning';
}
