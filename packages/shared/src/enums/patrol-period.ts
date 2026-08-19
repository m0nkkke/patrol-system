export const PATROL_PERIODS = ['morning', 'noon', 'evening'] as const;

export type PatrolPeriod = (typeof PATROL_PERIODS)[number];
