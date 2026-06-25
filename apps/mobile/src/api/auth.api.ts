import type { LoginDto } from '@patrol/shared';

import { apiClient } from './client';
import type { LoginResponse, MobileMeResponse } from './types';

export async function login(payload: LoginDto): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function getMe(): Promise<MobileMeResponse> {
  const response = await apiClient.get<MobileMeResponse>('/mobile/me');
  return response.data;
}
