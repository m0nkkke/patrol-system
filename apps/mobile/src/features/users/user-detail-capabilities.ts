import type { UserRole } from '@patrol/shared';

export type UserDetailCapabilities = {
  canAssignShops: boolean;
  canViewPatrolHistory: boolean;
  hasAccessKey: boolean;
};

export function userDetailCapabilities(role: UserRole): UserDetailCapabilities {
  return {
    canAssignShops:
      role === 'security_guard' || role === 'local_route_setter' || role === 'inspector',
    canViewPatrolHistory: role === 'security_guard',
    hasAccessKey: role !== 'admin',
  };
}

export function canDeleteUser(targetUserId: string, currentUserId?: string): boolean {
  return currentUserId !== undefined && targetUserId !== currentUserId;
}

export function canChangeUserStatus(targetUserId: string, currentUserId?: string): boolean {
  return currentUserId !== undefined && targetUserId !== currentUserId;
}
