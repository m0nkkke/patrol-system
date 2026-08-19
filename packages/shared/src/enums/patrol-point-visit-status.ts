export const PatrolPointVisitStatus = {
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  PENDING: 'pending',
  READY_TO_DEPART: 'ready_to_depart',
} as const;

export type PatrolPointVisitStatus =
  (typeof PatrolPointVisitStatus)[keyof typeof PatrolPointVisitStatus];

export const PATROL_POINT_VISIT_STATUSES = Object.values(PatrolPointVisitStatus);
