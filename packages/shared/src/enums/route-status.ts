export const RouteStatus = {
  NOT_CONFIGURED: 'not_configured',
  SETUP_IN_PROGRESS: 'setup_in_progress',
  READY: 'ready',
} as const;

export type RouteStatus = (typeof RouteStatus)[keyof typeof RouteStatus];
