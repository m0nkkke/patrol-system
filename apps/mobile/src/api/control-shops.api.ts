import type {
  AlertSeverity,
  PatrolIncidentType,
  PatrolReportStatus,
  PatrolReportType,
  PatrolRouteCategory,
  PatrolStatus,
  UserRole,
} from '@patrol/shared';

import { apiClient } from './client';

export type ControlShopOverview = {
  generatedAt: string;
  period: { from: string; to: string };
  recentIncidents: Array<{
    actualSeconds: number | null;
    createdAt: string;
    expectedSeconds: number | null;
    id: string;
    message: string;
    patrolId: string;
    severity: AlertSeverity;
    type: PatrolIncidentType;
  }>;
  recentPatrols: Array<{
    completedAt: string | null;
    dueAt: string | null;
    employee: { fullName: string | null; id: string };
    id: string;
    route: {
      category: PatrolRouteCategory | null;
      id: string | null;
      name: string | null;
    };
    scannedPoints: number;
    scheduleId: string | null;
    startedAt: string | null;
    status: PatrolStatus;
    totalPoints: number;
  }>;
  recentReports: Array<{
    createdAt: string;
    employee: { fullName: string | null; id: string };
    fileCount: number;
    id: string;
    reportType: PatrolReportType;
    status: PatrolReportStatus;
    submittedAt: string | null;
  }>;
  reportSummary: Array<{
    count: number;
    reportType: PatrolReportType;
    status: PatrolReportStatus;
  }>;
  shop: {
    address: string | null;
    externalId: string | null;
    id: string;
    isActive: boolean;
    name: string;
    regionId: string | null;
    regionName: string | null;
    routeRegisteredPoints: number;
    routeStatus: string;
    timezone: string;
  };
  staff: Array<{
    fullName: string;
    id: string;
    isActive: boolean;
    primaryShopId: string | null;
    role: UserRole;
  }>;
  stats: {
    cancelledPatrols: number;
    completedPatrols: number;
    completionRate: number;
    incidentCount: number;
    overduePatrols: number;
    totalPatrols: number;
  };
};

export async function getControlShopOverview(shopId: string): Promise<ControlShopOverview> {
  const response = await apiClient.get<ControlShopOverview>(
    `/control/shops/${shopId}/overview`,
  );
  return response.data;
}
