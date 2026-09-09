import type {
  CreatePatrolRouteDto,
  PatrolRouteVersion,
  UpdatePatrolRouteDto,
} from '@patrol/shared';

import type { PatrolRoute as SharedPatrolRoute } from './types';

import { apiClient } from './client';

export type PatrolRoutePoint = NonNullable<SharedPatrolRoute['points']>[number];

export type PatrolRoute = Omit<SharedPatrolRoute, 'points'> & {
  points?: PatrolRoutePoint[];
};

export async function getShopPatrolRoutes(shopId: string): Promise<PatrolRoute[]> {
  const response = await apiClient.get<PatrolRoute[]>(`/patrol-routes/shop/${shopId}`);
  return response.data;
}

export async function getPatrolRoute(routeId: string): Promise<PatrolRoute> {
  const response = await apiClient.get<PatrolRoute>(`/patrol-routes/${routeId}`);
  return response.data;
}

export async function getPatrolRouteVersions(routeId: string): Promise<PatrolRouteVersion[]> {
  const response = await apiClient.get<PatrolRouteVersion[]>(`/patrol-routes/${routeId}/versions`);
  return response.data;
}

export async function createPatrolRoute(
  payload: CreatePatrolRouteDto,
): Promise<PatrolRoute> {
  const response = await apiClient.post<PatrolRoute>('/patrol-routes', payload);
  return response.data;
}

export async function updatePatrolRoute(
  routeId: string,
  payload: UpdatePatrolRouteDto,
): Promise<PatrolRoute> {
  const response = await apiClient.patch<PatrolRoute>(`/patrol-routes/${routeId}`, payload);
  return response.data;
}

export async function archivePatrolRoute(routeId: string): Promise<PatrolRoute> {
  const response = await apiClient.post<PatrolRoute>(`/patrol-routes/${routeId}/archive`);
  return response.data;
}
