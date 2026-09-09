import type { PatrolRoutePointSettingDto } from '@patrol/shared';

export const DEFAULT_PATROL_POINT_DWELL_SECONDS = 90;
export const MAX_PATROL_POINT_DWELL_SECONDS = 120;
export const MIN_PATROL_POINT_DWELL_SECONDS = 0;

export function normalizeDwellSeconds(
  value: number,
  fallback = DEFAULT_PATROL_POINT_DWELL_SECONDS,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    MAX_PATROL_POINT_DWELL_SECONDS,
    Math.max(MIN_PATROL_POINT_DWELL_SECONDS, Math.round(value)),
  );
}

export function buildPointSettings(
  patrolPointIds: string[],
  dwellByPointId: Readonly<Record<string, number>>,
): PatrolRoutePointSettingDto[] {
  return patrolPointIds.map((patrolPointId) => ({
    patrolPointId,
    dwellSeconds: normalizeDwellSeconds(dwellByPointId[patrolPointId]),
  }));
}
