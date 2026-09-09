import type {
  CancelPatrolReportDto,
  CreatePatrolReportDto,
  SubmitPatrolReportDto,
} from '@patrol/shared';

import { apiClient } from './client';

export type MobilePatrolReport = {
  id: string;
  status: 'draft' | 'submitted' | 'cancelled';
};

export type ReportPhoto = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export async function createReportDraft(
  payload: CreatePatrolReportDto,
): Promise<MobilePatrolReport> {
  const response = await apiClient.post<MobilePatrolReport>('/mobile/reports', payload);
  return response.data;
}

export async function attachReportPhoto(
  reportId: string,
  photo: ReportPhoto,
): Promise<MobilePatrolReport> {
  const form = new FormData();
  form.append(
    'file',
    {
      uri: photo.uri,
      name: photo.fileName || `report-${Date.now()}.jpg`,
      type: photo.mimeType || 'image/jpeg',
    } as unknown as Blob,
  );
  const response = await apiClient.post<MobilePatrolReport>(
    `/mobile/reports/${reportId}/files`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

export async function submitReport(
  reportId: string,
  payload: SubmitPatrolReportDto,
): Promise<MobilePatrolReport> {
  const response = await apiClient.post<MobilePatrolReport>(
    `/mobile/reports/${reportId}/submit`,
    payload,
  );
  return response.data;
}

export async function cancelReportDraft(
  reportId: string,
  payload: CancelPatrolReportDto,
): Promise<MobilePatrolReport> {
  const response = await apiClient.post<MobilePatrolReport>(
    `/mobile/reports/${reportId}/cancel`,
    payload,
  );
  return response.data;
}
