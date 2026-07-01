import type { CreateShopDto, RouteStatus, UpdateShopDto } from '@patrol/shared';

import { apiClient } from './client';
import { PAGE_SIZE } from './use-infinite-paginated';
import type { Paginated, Shop } from './types';

export type ShopsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  routeStatus?: RouteStatus;
  isActive?: boolean;
  sort?: string;
};

export async function getShops(query: ShopsQuery = {}): Promise<Paginated<Shop>> {
  const { page = 1, limit = PAGE_SIZE, search, routeStatus, isActive, sort } = query;
  const response = await apiClient.get<Paginated<Shop>>('/shops', {
    params: { page, limit, search, routeStatus, isActive, sort },
  });
  return response.data;
}

export async function getShop(shopId: string): Promise<Shop> {
  const response = await apiClient.get<Shop>(`/shops/${shopId}`);
  return response.data;
}

export async function createShop(payload: CreateShopDto): Promise<Shop> {
  const response = await apiClient.post<Shop>('/shops', payload);
  return response.data;
}

export async function updateShop(shopId: string, payload: UpdateShopDto): Promise<Shop> {
  const response = await apiClient.patch<Shop>(`/shops/${shopId}`, payload);
  return response.data;
}
