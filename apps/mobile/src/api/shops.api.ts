import type { CreateShopDto } from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated, Shop } from './types';

export async function getShops(page = 1, limit = 50): Promise<Paginated<Shop>> {
  const response = await apiClient.get<Paginated<Shop>>('/shops', {
    params: { page, limit },
  });
  return response.data;
}

export async function createShop(payload: CreateShopDto): Promise<Shop> {
  const response = await apiClient.post<Shop>('/shops', payload);
  return response.data;
}
