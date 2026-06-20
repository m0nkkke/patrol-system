export const USER_ROLES = ['employee', 'manager', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];
