import type { ReplaceNfcTagDto } from '@patrol/shared';

import { apiClient } from './client';
import type { RoutePoint } from './types';

export async function getShopRoutePoints(shopId: string): Promise<RoutePoint[]> {
  const response = await apiClient.get<RoutePoint[]>(`/patrol-points/shop/${shopId}`);
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
