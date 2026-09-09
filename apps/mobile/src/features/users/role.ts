import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '@patrol/shared';

import { appIcons } from '@/theme';

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'security_guard', label: 'Сотрудник контроля' },
  { value: 'route_setter', label: 'Универсальный настройщик' },
  { value: 'local_route_setter', label: 'Локальный настройщик' },
  { value: 'inspector', label: 'Проверяющий' },
  { value: 'admin', label: 'Администратор' },
];

export const ROLE_ICONS: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
  security_guard: appIcons.patrol,
  route_setter: 'git-network-outline',
  local_route_setter: 'location-outline',
  inspector: 'clipboard-outline',
  admin: 'shield-checkmark-outline',
};

export function roleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
