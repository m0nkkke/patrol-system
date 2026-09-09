import type { AdminUser } from '@/api/types';

export function userInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('ru-RU'))
    .join('') || '?';
}

export function primaryShopLabel(user: AdminUser): string {
  const primaryShop = user.shops?.find((shop) => shop.id === user.shopId);
  if (primaryShop) {
    return primaryShop.name;
  }
  if (user.role === 'admin' || user.role === 'route_setter') {
    return 'Все магазины';
  }
  return user.shops?.[0]?.name ?? 'Магазин не назначен';
}
