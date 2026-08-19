export const PatrolScanAction = {
  ARRIVE: 'arrive',
  DEPART: 'depart',
} as const;

export type PatrolScanAction = (typeof PatrolScanAction)[keyof typeof PatrolScanAction];

export const PATROL_SCAN_ACTIONS = Object.values(PatrolScanAction);
