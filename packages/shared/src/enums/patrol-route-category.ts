export const PATROL_ROUTE_CATEGORIES = ['internal', 'external'] as const;

export type PatrolRouteCategory = (typeof PATROL_ROUTE_CATEGORIES)[number];
