import type { AdminUser, Shop } from '@/api/types';

import { primaryShopLabel, userInitials } from './user-card-data';

const shops: Shop[] = [
  {
    id: 'one',
    name: 'Первый магазин',
    timezone: 'Asia/Irkutsk',
    isActive: true,
    routeStatus: 'not_configured',
    routeExpectedPoints: 0,
    routeRegisteredPoints: 0,
  },
  {
    id: 'two',
    name: 'Основной магазин',
    timezone: 'Asia/Irkutsk',
    isActive: true,
    routeStatus: 'not_configured',
    routeExpectedPoints: 0,
    routeRegisteredPoints: 0,
  },
];

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user',
    fullName: 'Иван Петров',
    username: 'user',
    role: 'security_guard',
    isActive: true,
    ...overrides,
  };
}

describe('user card data', () => {
  it('builds initials from the first two name parts', () => {
    expect(userInitials('  Иван   Петров Сидоров ')).toBe('ИП');
    expect(userInitials('')).toBe('?');
  });

  it('uses the explicitly assigned primary shop', () => {
    expect(primaryShopLabel(user({ shopId: 'two', shops }))).toBe('Основной магазин');
  });

  it('shows global access for global roles', () => {
    expect(primaryShopLabel(user({ role: 'admin' }))).toBe('Все магазины');
    expect(primaryShopLabel(user({ role: 'route_setter' }))).toBe('Все магазины');
  });

  it('falls back safely when a primary shop is missing', () => {
    expect(primaryShopLabel(user({ shops }))).toBe('Первый магазин');
    expect(primaryShopLabel(user())).toBe('Магазин не назначен');
  });
});
