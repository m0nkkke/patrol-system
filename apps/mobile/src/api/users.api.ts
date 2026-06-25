import type { CreateUserDto } from '@patrol/shared';

import { apiClient } from './client';
import type { AdminUser, CreatedUser, Paginated } from './types';

export async function createUser(payload: CreateUserDto): Promise<CreatedUser> {
  const response = await apiClient.post<CreatedUser>('/users', payload);
  return response.data;
}

export async function getUsers(page = 1, limit = 100): Promise<Paginated<AdminUser>> {
  const response = await apiClient.get<Paginated<AdminUser>>('/users', {
    params: { page, limit },
  });
  return response.data;
}

export async function getUser(userId: string): Promise<AdminUser> {
  const response = await apiClient.get<AdminUser>(`/users/${userId}`);
  return response.data;
}
