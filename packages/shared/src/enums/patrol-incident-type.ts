export const PatrolIncidentType = {
  LONG_INTERVAL: 'long_interval',
  MISSED_POINT: 'missed_point',
  SHORT_INTERVAL: 'short_interval',
} as const;

export type PatrolIncidentType = (typeof PatrolIncidentType)[keyof typeof PatrolIncidentType];
