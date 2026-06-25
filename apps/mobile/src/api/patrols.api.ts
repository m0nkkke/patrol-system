import type { SyncPatrolEventsDto, SyncPatrolEventsResultDto } from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated, Patrol, RoutePoint } from './types';

export async function getRoute(): Promise<RoutePoint[]> {
  const response = await apiClient.get<RoutePoint[]>('/mobile/route');
  return response.data;
}

export async function getActivePatrol(): Promise<Patrol | null> {
  const response = await apiClient.get<Patrol | null>('/mobile/patrols/active');
  return response.data;
}

export async function startPatrol(): Promise<Patrol> {
  const response = await apiClient.post<Patrol>('/mobile/patrols/start');
  return response.data;
}

export async function syncPatrolEvents(
  patrolId: string,
  payload: SyncPatrolEventsDto,
): Promise<SyncPatrolEventsResultDto> {
  const response = await apiClient.post<SyncPatrolEventsResultDto>(
    `/mobile/patrols/${patrolId}/events/sync`,
    payload,
  );
  return response.data;
}

export async function getShopPatrols(
  shopId: string,
  page = 1,
  limit = 20,
): Promise<Paginated<Patrol>> {
  const response = await apiClient.get<Paginated<Patrol>>(`/patrols/shop/${shopId}`, {
    params: { page, limit },
  });
  return response.data;
}

export async function getPatrol(patrolId: string): Promise<Patrol> {
  const response = await apiClient.get<Patrol>(`/patrols/${patrolId}`);
  return response.data;
}
