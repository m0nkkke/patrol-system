import type { CreatePatrolScheduleDto, UpdatePatrolScheduleDto } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSchedule,
  deactivateSchedule,
  getSchedule,
  getShopSchedules,
  updateSchedule,
} from '@/api/schedules.api';

function shopSchedulesKey(shopId: string): [string, string] {
  return ['shop-schedules', shopId];
}

export function useShopSchedules(shopId: string) {
  return useQuery({
    queryKey: shopSchedulesKey(shopId),
    queryFn: () => getShopSchedules(shopId),
  });
}

export function useSchedule(scheduleId: string) {
  return useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => getSchedule(scheduleId),
  });
}

export function useCreateSchedule(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePatrolScheduleDto) => createSchedule(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopSchedulesKey(shopId) }),
  });
}

export function useUpdateSchedule(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePatrolScheduleDto }) =>
      updateSchedule(id, payload),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(['schedule', variables.id], updated);
      queryClient.invalidateQueries({ queryKey: shopSchedulesKey(shopId) });
    },
  });
}

export function useDeactivateSchedule(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => deactivateSchedule(scheduleId),
    onSuccess: (updated, scheduleId) => {
      queryClient.setQueryData(['schedule', scheduleId], updated);
      queryClient.invalidateQueries({ queryKey: shopSchedulesKey(shopId) });
    },
  });
}
