import type {
  AlertSeverity,
  PatrolIncidentType,
  PatrolRouteCategory,
  PatrolStatus,
} from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated } from './types';

export type ControlIncident = {
  actualSeconds: number | null;
  createdAt: string;
  employee: { fullName: string | null; id: string };
  expectedSeconds: number | null;
  fromPatrolPoint: { id: string; name: string; sortOrder: number } | null;
  id: string;
  message: string;
  patrol: {
    completedAt: string | null;
    dueAt: string | null;
    id: string;
    period: string | null;
    routeCategory: PatrolRouteCategory | null;
    routeId: string | null;
    routeName: string | null;
    scheduleId: string | null;
    startedAt: string | null;
    status: PatrolStatus;
  };
  patrolEvent: {
    deviceId: string;
    id: string;
    lateSync: boolean;
    nfcUid: string;
    pointDeactivatedAfterScan: boolean;
    scannedAt: string;
  } | null;
  severity: AlertSeverity;
  shop: { id: string; name: string | null };
  toPatrolPoint: { id: string; name: string; sortOrder: number } | null;
  type: PatrolIncidentType;
};

export type ControlIncidentFilters = {
  shopId?: string;
  employeeId?: string;
  patrolId?: string;
  search?: string;
  type?: PatrolIncidentType;
  severity?: AlertSeverity;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function getControlIncidents(
  filters: ControlIncidentFilters = {},
): Promise<Paginated<ControlIncident>> {
  const response = await apiClient.get<Paginated<ControlIncident>>('/control/incidents', {
    params: filters,
  });
  return response.data;
}

export async function getControlIncident(incidentId: string): Promise<ControlIncident> {
  const response = await apiClient.get<ControlIncident>(`/control/incidents/${incidentId}`);
  return response.data;
}
