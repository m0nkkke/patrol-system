import type {
  PatrolStatus,
  ReportMissedPointAttemptDto,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
} from '@patrol/shared';

import { apiClient } from './client';
import { PAGE_SIZE } from './use-infinite-paginated';
import type { AvailablePatrolSchedule, Paginated, Patrol, RoutePoint } from './types';

export type PatrolsQuery = {
  page?: number;
  limit?: number;
  status?: PatrolStatus;
  sort?: string;
};

export async function getRoute(): Promise<RoutePoint[]> {
  const response = await apiClient.get<RoutePoint[]>('/mobile/route');
  return response.data;
}

export async function getActivePatrol(): Promise<Patrol | null> {
  const response = await apiClient.get<Patrol | null>('/mobile/patrols/active');
  return response.data;
}

export async function getAvailableSchedules(): Promise<AvailablePatrolSchedule[]> {
  const response = await apiClient.get<AvailablePatrolSchedule[]>(
    '/mobile/patrol-schedules/available',
  );
  return response.data;
}

export async function startPatrol(scheduleId?: string): Promise<Patrol> {
  const response = await apiClient.post<Patrol>(
    '/mobile/patrols/start',
    scheduleId === undefined ? {} : { scheduleId },
  );
  return response.data;
}

export async function completePatrol(patrolId: string, completionReport?: string): Promise<Patrol> {
  const response = await apiClient.post<Patrol>(
    `/mobile/patrols/${patrolId}/complete`,
    completionReport === undefined ? {} : { completionReport },
  );
  return response.data;
}

export async function cancelPatrol(patrolId: string, cancellationReason?: string): Promise<Patrol> {
  const response = await apiClient.post<Patrol>(
    `/mobile/patrols/${patrolId}/cancel`,
    cancellationReason === undefined ? {} : { cancellationReason },
  );
  return response.data;
}

export async function reportMissedPointAttempt(
  patrolId: string,
  payload: ReportMissedPointAttemptDto,
): Promise<void> {
  await apiClient.post(`/mobile/patrols/${patrolId}/missed-point-attempts`, payload);
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
  query: PatrolsQuery = {},
): Promise<Paginated<Patrol>> {
  const { page = 1, limit = PAGE_SIZE, status, sort } = query;
  const response = await apiClient.get<Paginated<Patrol>>(`/patrols/shop/${shopId}`, {
    params: { page, limit, status, sort },
  });
  return response.data;
}

export async function getEmployeePatrols(
  employeeId: string,
  query: PatrolsQuery = {},
): Promise<Paginated<Patrol>> {
  const { page = 1, limit = PAGE_SIZE, status, sort } = query;
  const response = await apiClient.get<Paginated<Patrol>>(`/patrols/employee/${employeeId}`, {
    params: { page, limit, status, sort },
  });
  return response.data;
}

export async function getPatrol(patrolId: string): Promise<Patrol> {
  const response = await apiClient.get<Patrol>(`/patrols/${patrolId}`);
  return response.data;
}
