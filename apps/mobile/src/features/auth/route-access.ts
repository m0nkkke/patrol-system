import type { UserRole } from '@patrol/shared';

const COMMON_ROUTES = new Set(['profile']);

const ROLE_ROUTES: Record<UserRole, ReadonlySet<string>> = {
  admin: new Set([
    'control-appeals',
    'control-patrols',
    'control-reports',
    'control-shops',
    'control-staff',
    'history',
    'incident',
    'incidents',
    'nfc-replace',
    'patrol-routes',
    'route-setup',
    'schedules',
    'shops',
    'users',
  ]),
  inspector: new Set([
    'control-appeals',
    'control-patrols',
    'control-reports',
    'control-shops',
    'control-staff',
    'history',
    'incident',
    'incidents',
  ]),
  local_route_setter: new Set([
    'nfc-replace',
    'patrol-routes',
    'route-setup',
    'schedules',
  ]),
  route_setter: new Set([
    'nfc-replace',
    'patrol-routes',
    'route-setup',
    'schedules',
  ]),
  security_guard: new Set([
    'anonymous',
    'patrol',
    'reports',
    'schedule-plan',
    'select-shop',
  ]),
};

export function canAccessRoute(role: UserRole | undefined, rootSegment: string | undefined): boolean {
  if (!rootSegment) {
    return true;
  }

  if (role === undefined) {
    return false;
  }

  return COMMON_ROUTES.has(rootSegment) || ROLE_ROUTES[role].has(rootSegment);
}
