import { describe, expect, it } from '@jest/globals';
import type { UserRole } from '@patrol/shared';

import { canAccessRoute } from './route-access';

describe('canAccessRoute', () => {
  it.each<UserRole>([
    'admin',
    'inspector',
    'local_route_setter',
    'route_setter',
    'security_guard',
  ])('allows common routes for %s', (role) => {
    expect(canAccessRoute(role, undefined)).toBe(true);
    expect(canAccessRoute(role, 'profile')).toBe(true);
  });

  it.each([
    ['security_guard', 'patrol'],
    ['security_guard', 'reports'],
    ['route_setter', 'route-setup'],
    ['local_route_setter', 'schedules'],
    ['inspector', 'control-patrols'],
    ['admin', 'users'],
  ] satisfies Array<[UserRole, string]>)('allows %s to open %s', (role, route) => {
    expect(canAccessRoute(role, route)).toBe(true);
  });

  it.each(['anonymous', 'patrol', 'profile', 'reports', 'schedule-plan', 'select-shop'])(
    'allows security guard to open %s',
    (route) => {
      expect(canAccessRoute('security_guard', route)).toBe(true);
    },
  );

  it.each(['nfc-replace', 'patrol-routes', 'route-setup', 'schedules'])(
    'allows both route setter roles to open %s',
    (route) => {
      expect(canAccessRoute('route_setter', route)).toBe(true);
      expect(canAccessRoute('local_route_setter', route)).toBe(true);
    },
  );

  it.each([
    ['security_guard', 'users'],
    ['route_setter', 'patrol'],
    ['local_route_setter', 'control-reports'],
    ['inspector', 'shops'],
    ['admin', 'patrol'],
    ['inspector', 'route-setup'],
    ['security_guard', 'control-staff'],
    ['local_route_setter', 'control-patrols'],
    ['route_setter', 'users'],
  ] satisfies Array<[UserRole, string]>)('blocks %s from opening %s', (role, route) => {
    expect(canAccessRoute(role, route)).toBe(false);
  });

  it('denies unknown and authentication routes', () => {
    expect(canAccessRoute('admin', 'unknown')).toBe(false);
    expect(canAccessRoute('admin', 'login')).toBe(false);
    expect(canAccessRoute(undefined, 'profile')).toBe(false);
    expect(canAccessRoute(undefined, 'patrol')).toBe(false);
  });
});
