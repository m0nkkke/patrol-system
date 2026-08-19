export const PATROL_REPORT_TYPES = [
  'photo_report',
  'morning',
  'closing',
  'sunday',
  'heating',
  'evacuation',
] as const;

export type PatrolReportType = (typeof PATROL_REPORT_TYPES)[number];
