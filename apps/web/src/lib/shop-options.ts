import { api } from './api';
import type { PaginatedResponse, Shop } from '../types/api';

export async function loadShopOptions(search?: string): Promise<PaginatedResponse<Shop>> {
  const items: Shop[] = [];
  for (let page = 1; ; page++) {
    const { data } = await api.get<PaginatedResponse<Shop>>('/shops', {
      params: { limit: 100, page, search: search || undefined, sort: 'name:asc' },
    });
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0)
      return { items, total: data.total, page: 1, limit: items.length };
  }
}
