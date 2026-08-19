export const PatrolIncidentType = {
  LONG_INTERVAL: 'long_interval',
  MISSED_POINT: 'missed_point',
  PATROL_OVERDUE: 'patrol_overdue',
  POINT_DWELL_TOO_SHORT: 'point_dwell_too_short',
  ROUTE_SUSPICIOUSLY_FAST: 'route_suspiciously_fast',
  ROUTE_TOO_FAST: 'route_too_fast',
  ROUTE_TOO_SLOW: 'route_too_slow',
  SCHEDULE_DEVIATION: 'schedule_deviation',
  SHORT_INTERVAL: 'short_interval',
} as const;

export type PatrolIncidentType = (typeof PatrolIncidentType)[keyof typeof PatrolIncidentType];
