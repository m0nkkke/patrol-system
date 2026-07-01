import type { CreatePatrolScheduleDto, UpdatePatrolScheduleDto } from '@patrol/shared';

import { apiClient } from './client';
import type { PatrolSchedule } from './types';

export async function getShopSchedules(shopId: string): Promise<PatrolSchedule[]> {
  const response = await apiClient.get<PatrolSchedule[]>(`/patrol-schedules/shop/${shopId}`);
  return response.data;
}

export async function getSchedule(scheduleId: string): Promise<PatrolSchedule> {
  const response = await apiClient.get<PatrolSchedule>(`/patrol-schedules/${scheduleId}`);
  return response.data;
}

export async function createSchedule(payload: CreatePatrolScheduleDto): Promise<PatrolSchedule> {
  const response = await apiClient.post<PatrolSchedule>('/patrol-schedules', payload);
  return response.data;
}

export async function updateSchedule(
  scheduleId: string,
  payload: UpdatePatrolScheduleDto,
): Promise<PatrolSchedule> {
  const response = await apiClient.patch<PatrolSchedule>(`/patrol-schedules/${scheduleId}`, payload);
  return response.data;
}

export async function deactivateSchedule(scheduleId: string): Promise<PatrolSchedule> {
  const response = await apiClient.delete<PatrolSchedule>(`/patrol-schedules/${scheduleId}`);
  return response.data;
}
