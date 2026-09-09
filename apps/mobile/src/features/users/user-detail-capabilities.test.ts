import type { UserRole } from '@patrol/shared';

import { canDeleteUser, userDetailCapabilities } from './user-detail-capabilities';

describe('userDetailCapabilities', () => {
  it.each<[
    UserRole,
    boolean,
    boolean,
    boolean,
  ]>([
    ['security_guard', true, true, true],
    ['local_route_setter', true, false, true],
    ['inspector', true, false, true],
    ['route_setter', false, false, true],
    ['admin', false, false, false],
  ])(
    'returns actions for %s',
    (role, canAssignShops, canViewPatrolHistory, hasAccessKey) => {
      expect(userDetailCapabilities(role)).toEqual({
        canAssignShops,
        canViewPatrolHistory,
        hasAccessKey,
      });
    },
  );
});

describe('canDeleteUser', () => {
  it('does not allow an administrator to delete their own account', () => {
    expect(canDeleteUser('admin-id', 'admin-id')).toBe(false);
  });

  it('allows deleting another user', () => {
    expect(canDeleteUser('other-id', 'admin-id')).toBe(true);
  });
});
