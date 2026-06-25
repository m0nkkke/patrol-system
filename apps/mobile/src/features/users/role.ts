import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '@patrol/shared';

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'Обходчик' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'admin', label: 'Администратор' },
];

export const ROLE_ICONS: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
  employee: 'walk-outline',
  manager: 'clipboard-outline',
  admin: 'shield-checkmark-outline',
};

export function roleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
