import type { BindRoutePointNfcDto, StartRouteSetupDto } from '@patrol/shared';

import { apiClient } from './client';
import type { RouteSetupState } from './types';

export async function getRouteSetup(shopId: string): Promise<RouteSetupState> {
  const response = await apiClient.get<RouteSetupState>(`/mobile/shops/${shopId}/route-setup`);
  return response.data;
}

export async function startRouteSetup(
  shopId: string,
  payload: StartRouteSetupDto,
): Promise<RouteSetupState> {
  const response = await apiClient.post<RouteSetupState>(
    `/mobile/shops/${shopId}/route-setup/start`,
    payload,
  );
  return response.data;
}

export async function scanRoutePoint(
  shopId: string,
  payload: BindRoutePointNfcDto,
): Promise<RouteSetupState> {
  const response = await apiClient.post<RouteSetupState>(
    `/mobile/shops/${shopId}/route-setup/scan`,
    payload,
  );
  return response.data;
}

export async function resetRouteSetup(shopId: string): Promise<RouteSetupState> {
  const response = await apiClient.post<RouteSetupState>(
    `/mobile/shops/${shopId}/route-setup/reset`,
    {},
  );
  return response.data;
}
