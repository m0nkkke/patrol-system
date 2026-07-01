import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelPatrol,
  completePatrol,
  getActivePatrol,
  getAvailableSchedules,
  getRoute,
  startPatrol,
} from '@/api/patrols.api';

const ROUTE_KEY = ['patrol-route'] as const;
const ACTIVE_PATROL_KEY = ['active-patrol'] as const;
const AVAILABLE_SCHEDULES_KEY = ['available-schedules'] as const;

export function usePatrolRoute() {
  return useQuery({
    queryKey: ROUTE_KEY,
    queryFn: () => getRoute(),
  });
}

export function useActivePatrol() {
  return useQuery({
    queryKey: ACTIVE_PATROL_KEY,
    queryFn: () => getActivePatrol(),
  });
}

export function useAvailableSchedules() {
  return useQuery({
    queryKey: AVAILABLE_SCHEDULES_KEY,
    queryFn: () => getAvailableSchedules(),
  });
}

export function useStartPatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId?: string) => startPatrol(scheduleId),
    onSuccess: (patrol) => queryClient.setQueryData(ACTIVE_PATROL_KEY, patrol),
  });
}

export function useCompletePatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patrolId, report }: { patrolId: string; report?: string }) =>
      completePatrol(patrolId, report),
    onSuccess: () => {
      queryClient.setQueryData(ACTIVE_PATROL_KEY, null);
      void queryClient.invalidateQueries({ queryKey: AVAILABLE_SCHEDULES_KEY });
    },
  });
}

export function useCancelPatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patrolId, reason }: { patrolId: string; reason?: string }) =>
      cancelPatrol(patrolId, reason),
    onSuccess: () => {
      queryClient.setQueryData(ACTIVE_PATROL_KEY, null);
      void queryClient.invalidateQueries({ queryKey: AVAILABLE_SCHEDULES_KEY });
    },
  });
}
