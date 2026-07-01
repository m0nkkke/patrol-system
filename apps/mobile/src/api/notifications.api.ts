import type { DevicePushTokenResponseDto, RegisterDevicePushTokenDto } from '@patrol/shared';

import { apiClient } from './client';

export async function registerDevicePushToken(
  payload: RegisterDevicePushTokenDto,
): Promise<DevicePushTokenResponseDto> {
  const response = await apiClient.post<DevicePushTokenResponseDto>(
    '/mobile/devices/push-token',
    payload,
  );
  return response.data;
}
