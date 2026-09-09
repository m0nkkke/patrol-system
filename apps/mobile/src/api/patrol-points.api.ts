import type {
  CreatePatrolPointWithNfcDto,
  CreatePatrolPointDto,
  ReplaceNfcTagDto,
  UpdatePatrolPointDto,
} from '@patrol/shared';

import { apiClient } from './client';
import type { RoutePoint } from './types';

export async function getShopRoutePoints(shopId: string): Promise<RoutePoint[]> {
  const response = await apiClient.get<RoutePoint[]>(`/patrol-points/shop/${shopId}`);
  return response.data;
}

export async function getArchivedShopRoutePoints(shopId: string): Promise<RoutePoint[]> {
  const response = await apiClient.get<RoutePoint[]>(`/patrol-points/shop/${shopId}/archived`);
  return response.data;
}

export async function getPatrolPoint(pointId: string): Promise<RoutePoint> {
  const response = await apiClient.get<RoutePoint>(`/patrol-points/${pointId}`);
  return response.data;
}

export async function createPatrolPoint(payload: CreatePatrolPointDto): Promise<RoutePoint> {
  const response = await apiClient.post<RoutePoint>('/patrol-points', payload);
  return response.data;
}

export async function createPatrolPointWithNfc(
  payload: CreatePatrolPointWithNfcDto,
): Promise<RoutePoint> {
  const response = await apiClient.post<RoutePoint>('/patrol-points/with-nfc', payload);
  return response.data;
}

export type UpdatePatrolPointInput = UpdatePatrolPointDto;

export async function updatePatrolPoint(
  pointId: string,
  payload: UpdatePatrolPointInput,
): Promise<RoutePoint> {
  const response = await apiClient.patch<RoutePoint>(`/patrol-points/${pointId}`, payload);
  return response.data;
}

export async function archivePatrolPoint(pointId: string): Promise<RoutePoint> {
  const response = await apiClient.delete<RoutePoint>(`/patrol-points/${pointId}`);
  return response.data;
}

export async function restorePatrolPoint(pointId: string): Promise<RoutePoint> {
  const response = await apiClient.post<RoutePoint>(`/patrol-points/${pointId}/restore`);
  return response.data;
}

export type PatrolPointPhoto = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export async function uploadPatrolPointPhoto(
  pointId: string,
  photo: PatrolPointPhoto,
): Promise<RoutePoint> {
  const form = new FormData();
  form.append(
    'file',
    {
      uri: photo.uri,
      name: photo.fileName || `patrol-point-${Date.now()}.jpg`,
      type: photo.mimeType || 'image/jpeg',
    } as unknown as Blob,
  );
  const response = await apiClient.post<RoutePoint>(`/patrol-points/${pointId}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export type NfcTagReplacement = {
  id: string;
  patrolPointId: string;
  oldNfcUid?: string;
  newNfcUid: string;
};

export async function replaceNfcTag(
  pointId: string,
  payload: ReplaceNfcTagDto,
): Promise<NfcTagReplacement> {
  const response = await apiClient.post<NfcTagReplacement>(
    `/patrol-points/${pointId}/replace-nfc`,
    payload,
  );
  return response.data;
}
