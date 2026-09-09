import type { PatrolPeriod, PatrolReportStatus, PatrolReportType } from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated } from './types';

export type ControlReportFile = {
  createdAt: string;
  height: number | null;
  id: string;
  kind: string;
  mimeType: string;
  originalName: string | null;
  sizeBytes: number;
  url: string;
  width: number | null;
};

export type ControlReport = {
  cancellationReason: string | null;
  cancelledAt: string | null;
  comment: string | null;
  createdAt: string;
  employee: { fullName: string | null; id: string };
  fields: Record<string, unknown>;
  files: ControlReportFile[];
  id: string;
  patrolId: string | null;
  period: PatrolPeriod | null;
  reportType: PatrolReportType;
  route: { id: string; name: string | null } | null;
  schedule: { id: string; name: string | null } | null;
  schemaVersion: string;
  shop: { id: string; name: string | null };
  status: PatrolReportStatus;
  submittedAt: string | null;
};

export type ControlReportFilters = {
  shopId?: string;
  employeeId?: string;
  patrolId?: string;
  reportType?: PatrolReportType;
  status?: PatrolReportStatus;
  period?: PatrolPeriod;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function getControlReports(
  filters: ControlReportFilters = {},
): Promise<Paginated<ControlReport>> {
  const response = await apiClient.get<Paginated<ControlReport>>('/control/reports', {
    params: filters,
  });
  return response.data;
}

export async function getControlReport(reportId: string): Promise<ControlReport> {
  const response = await apiClient.get<ControlReport>(`/control/reports/${reportId}`);
  return response.data;
}
