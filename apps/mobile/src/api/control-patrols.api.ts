import type {
  AlertSeverity,
  PatrolIncidentType,
  PatrolPointVisitStatus,
  PatrolReportStatus,
  PatrolReportType,
  PatrolRouteCategory,
  PatrolScanAction,
  PatrolSnapshotPoint,
  PatrolStatus,
} from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated } from './types';

export type ControlPatrolSummary = {
  completedAt: string | null;
  dueAt: string | null;
  durationIsFinal: boolean;
  durationSeconds: number | null;
  employee: { fullName: string | null; id: string };
  expectedSeconds: number | null;
  id: string;
  incidentCount: number;
  period: string | null;
  progress: { scannedPoints: number; totalPoints: number };
  reportCount: number;
  route: { category: PatrolRouteCategory | null; id: string | null; name: string | null };
  scheduleId: string | null;
  shop: { id: string; name: string | null };
  startedAt: string | null;
  status: PatrolStatus;
};

type ControlVisitEvent = {
  accepted: boolean;
  deviceId: string;
  id: string;
  lateSync: boolean;
  nfcUid: string;
  scannedAt: string;
} | null;

export type ControlPatrolDetail = ControlPatrolSummary & {
  routeSnapshot: PatrolSnapshotPoint[] | null;
  cancellationReason: string | null;
  completionReport: string | null;
  events: Array<{
    accepted: boolean;
    deviceId: string;
    gpsAccuracy: number | null;
    id: string;
    isSuspicious: boolean;
    lateSync: boolean;
    lat: number | null;
    lng: number | null;
    nfcUid: string;
    patrolPoint: { id: string; name: string; sortOrder: number } | null;
    receivedAt: string;
    rejectionReason: string | null;
    scanAction: PatrolScanAction;
    scannedAt: string;
    suspicionReason: string | null;
  }>;
  incidents: Array<{
    actualSeconds: number | null;
    createdAt: string;
    expectedSeconds: number | null;
    id: string;
    message: string;
    severity: AlertSeverity;
    type: PatrolIncidentType;
  }>;
  notes: string | null;
  reports: Array<{
    fileCount: number;
    id: string;
    reportType: PatrolReportType;
    status: PatrolReportStatus;
    submittedAt: string | null;
  }>;
  timingProfile: {
    averageTotalSeconds: number;
    calculatedFrom: string;
    calculatedTo: string;
    fastSeconds: number;
    sampleCount: number;
    slowSeconds: number;
    suspiciousFastSeconds: number;
  } | null;
  visits: Array<{
    arrivedAt: string;
    arrivalEvent: ControlVisitEvent;
    departedAt: string | null;
    departureEvent: ControlVisitEvent;
    dwellSeconds: number | null;
    id: string;
    lockedUntil: string;
    patrolPoint: { id: string; name: string; sortOrder: number } | null;
    status: PatrolPointVisitStatus;
  }>;
};

export type ControlPatrolFilters = {
  shopId?: string;
  employeeId?: string;
  routeId?: string;
  status?: PatrolStatus;
  search?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function getControlPatrols(
  filters: ControlPatrolFilters = {},
): Promise<Paginated<ControlPatrolSummary>> {
  const response = await apiClient.get<Paginated<ControlPatrolSummary>>('/control/patrols', {
    params: filters,
  });
  return response.data;
}

export async function getControlPatrol(patrolId: string): Promise<ControlPatrolDetail> {
  const response = await apiClient.get<ControlPatrolDetail>(`/control/patrols/${patrolId}`);
  return response.data;
}
