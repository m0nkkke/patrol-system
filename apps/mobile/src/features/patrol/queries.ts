import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getActivePatrol, getRoute, startPatrol } from '@/api/patrols.api';

const ROUTE_KEY = ['patrol-route'] as const;
const ACTIVE_PATROL_KEY = ['active-patrol'] as const;

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

export function useStartPatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startPatrol(),
    onSuccess: (patrol) => queryClient.setQueryData(ACTIVE_PATROL_KEY, patrol),
  });
}
