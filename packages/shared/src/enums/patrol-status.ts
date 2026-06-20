export const PATROL_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
] as const;

export type PatrolStatus = (typeof PATROL_STATUSES)[number];
