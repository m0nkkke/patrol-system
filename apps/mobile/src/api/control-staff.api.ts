import type {
  ControlStaffResponseDto,
  FindControlStaffDto,
} from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated } from './types';

export type ControlStaffMember = ControlStaffResponseDto;
export type ControlStaffFilters = Partial<FindControlStaffDto>;
export type ControlStaffSort = NonNullable<FindControlStaffDto['sort']>;
export type CreatedControlGuard = {
  accessKey?: string;
  fullName: string;
  id: string;
};
export type CreateControlGuardPayload = {
  fullName: string;
  shopIds: string[];
};

export async function getControlStaff(
  filters: ControlStaffFilters = {},
): Promise<Paginated<ControlStaffMember>> {
  const response = await apiClient.get<Paginated<ControlStaffMember>>('/control/staff', {
    params: filters,
  });
  return response.data;
}

export async function getControlStaffMember(memberId: string): Promise<ControlStaffMember> {
  const response = await apiClient.get<ControlStaffMember>(`/control/staff/${memberId}`);
  return response.data;
}

export async function createControlGuard(
  payload: CreateControlGuardPayload,
): Promise<CreatedControlGuard> {
  const response = await apiClient.post<CreatedControlGuard>('/control/staff', payload);
  return response.data;
}
