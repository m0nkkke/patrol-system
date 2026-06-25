import { apiClient } from './client';
import type { RoutePoint } from './types';

export async function getShopRoutePoints(shopId: string): Promise<RoutePoint[]> {
  const response = await apiClient.get<RoutePoint[]>(`/patrol-points/shop/${shopId}`);
  return response.data;
}
