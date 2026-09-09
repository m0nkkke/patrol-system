import type {
  NfcWaitStateDto,
  MobileSchedulePlanDto,
  PatrolSnapshotPoint,
  PatrolStatus,
  ReportMissedPointAttemptDto,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
} from '@patrol/shared';

import { apiClient } from './client';
import { PAGE_SIZE } from './use-infinite-paginated';
import type { AvailablePatrolSchedule, Paginated, Patrol } from './types';

export type MobileRoutePoint = PatrolSnapshotPoint;

export type PatrolsQuery = {
  from?: string;
  page?: number;
  limit?: number;
  status?: PatrolStatus;
  sort?: string;
  to?: string;
};

export async function getRoute(shopId: string): Promise<MobileRoutePoint[]> {
  const response = await apiClient.get<MobileRoutePoint[]>(`/mobile/shops/${shopId}/route`);
  return response.data;
}

export async function getActivePatrol(): Promise<Patrol | null> {
  const response = await apiClient.get<Patrol | null>('/mobile/patrols/active');
  return response.data;
}

export async function getPatrolNfcWaitState(patrolId: string): Promise<NfcWaitStateDto> {
  const response = await apiClient.get<NfcWaitStateDto>(
    `/mobile/patrols/${patrolId}/nfc-wait-state`,
  );
  return response.data;
}

export async function getSchedulePlan(
  days = 7,
  shopId?: string,
): Promise<MobileSchedulePlanDto> {
  const response = await apiClient.get<MobileSchedulePlanDto>('/mobile/schedule-plan', {
    params: { days, ...(shopId ? { shopId } : {}) },
  });
  return response.data;
}

export async function getAvailableSchedules(shopId: string): Promise<AvailablePatrolSchedule[]> {
  const response = await apiClient.get<AvailablePatrolSchedule[]>(
    `/mobile/shops/${shopId}/patrol-schedules/available`,
  );
  return response.data;
}

export async function startPatrol(shopId: string, scheduleId?: string): Promise<Patrol> {
  const response = await apiClient.post<Patrol>('/mobile/patrols/start', {
    shopId,
    ...(scheduleId === undefined ? {} : { scheduleId }),
  });
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
  const { from, page = 1, limit = PAGE_SIZE, status, sort, to } = query;
  const response = await apiClient.get<Paginated<Patrol>>(`/patrols/shop/${shopId}`, {
    params: { from, page, limit, status, sort, to },
  });
  return response.data;
}

export async function getEmployeePatrols(
  employeeId: string,
  query: PatrolsQuery = {},
): Promise<Paginated<Patrol>> {
  const { from, page = 1, limit = PAGE_SIZE, status, sort, to } = query;
  const response = await apiClient.get<Paginated<Patrol>>(`/patrols/employee/${employeeId}`, {
    params: { from, page, limit, status, sort, to },
  });
  return response.data;
}

export async function getPatrol(patrolId: string): Promise<Patrol> {
  const response = await apiClient.get<Patrol>(`/patrols/${patrolId}`);
  return response.data;
}
