import type { AssignUserShopsDto, CreateUserDto, UpdateUserDto, UserRole } from '@patrol/shared';

import { apiClient } from './client';
import { PAGE_SIZE } from './use-infinite-paginated';
import type { AdminUser, CreatedUser, Paginated } from './types';

export async function createUser(payload: CreateUserDto): Promise<CreatedUser> {
  const response = await apiClient.post<CreatedUser>('/users', payload);
  return response.data;
}

export async function updateUser(userId: string, payload: UpdateUserDto): Promise<AdminUser> {
  const response = await apiClient.patch<AdminUser>(`/users/${userId}`, payload);
  return response.data;
}

export async function rotateUserAccessKey(userId: string): Promise<AdminUser> {
  const response = await apiClient.post<AdminUser>(`/users/${userId}/access-key/rotate`);
  return response.data;
}

export type UsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sort?: string;
};

export async function getUsers(query: UsersQuery = {}): Promise<Paginated<AdminUser>> {
  const { page = 1, limit = PAGE_SIZE, search, role, isActive, sort } = query;
  const response = await apiClient.get<Paginated<AdminUser>>('/users', {
    params: { page, limit, search, role, isActive, sort },
  });
  return response.data;
}

export async function getUser(userId: string): Promise<AdminUser> {
  const response = await apiClient.get<AdminUser>(`/users/${userId}`);
  return response.data;
}

export async function assignUserShops(
  userId: string,
  payload: AssignUserShopsDto,
): Promise<AdminUser> {
  const response = await apiClient.put<AdminUser>(`/users/${userId}/shops`, payload);
  return response.data;
}
