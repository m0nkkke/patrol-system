export const USER_ROLES = [
  'security_guard',
  'route_setter',
  'local_route_setter',
  'inspector',
  'admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
