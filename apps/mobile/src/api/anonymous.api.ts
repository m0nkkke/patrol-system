import type {
  AnonymousAppealCategory,
  AnonymousAppealStatus,
  CreateAnonymousAppealDto,
  UpdateAnonymousAppealDto,
} from '@patrol/shared';

import { getDeviceId } from '@/device/device-id';

import { apiClient } from './client';
import type { Paginated } from './types';

export async function createAnonymousAppeal(
  payload: CreateAnonymousAppealDto,
): Promise<{ id: string }> {
  const deviceId = await getDeviceId();
  const response = await apiClient.post<{ id: string }>('/mobile/anonymous', payload, {
    headers: { 'x-device-id': deviceId },
  });
  return response.data;
}

export type AnonymousAppeal = {
  id: string;
  shopId: string;
  shop?: { id: string; name: string; address: string | null };
  category: AnonymousAppealCategory;
  status: AnonymousAppealStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type AnonymousAppealFilters = {
  category?: AnonymousAppealCategory;
  status?: AnonymousAppealStatus;
  shopId?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function getAnonymousAppeals(
  filters: AnonymousAppealFilters = {},
): Promise<Paginated<AnonymousAppeal>> {
  const response = await apiClient.get<Paginated<AnonymousAppeal>>('/anonymous', {
    params: filters,
  });
  return response.data;
}

export async function getAnonymousAppeal(appealId: string): Promise<AnonymousAppeal> {
  const response = await apiClient.get<AnonymousAppeal>(`/anonymous/${appealId}`);
  return response.data;
}

export async function updateAnonymousAppeal(
  appealId: string,
  payload: UpdateAnonymousAppealDto,
): Promise<AnonymousAppeal> {
  const response = await apiClient.patch<AnonymousAppeal>(`/anonymous/${appealId}`, payload);
  return response.data;
}
