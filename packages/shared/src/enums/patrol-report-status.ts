export const PATROL_REPORT_STATUSES = ['draft', 'submitted', 'cancelled'] as const;

export type PatrolReportStatus = (typeof PATROL_REPORT_STATUSES)[number];
