import { useQuery } from '@tanstack/react-query';

import { getShopRoutePoints } from '@/api/patrol-points.api';
import { getPatrol, getShopPatrols } from '@/api/patrols.api';

export function useShopPatrols(shopId: string) {
  return useQuery({
    queryKey: ['shop-patrols', shopId],
    queryFn: () => getShopPatrols(shopId),
  });
}

export function usePatrol(patrolId: string) {
  return useQuery({
    queryKey: ['patrol', patrolId],
    queryFn: () => getPatrol(patrolId),
  });
}

export function usePatrolPoints(shopId: string | undefined) {
  return useQuery({
    queryKey: ['patrol-points', shopId],
    queryFn: () => getShopRoutePoints(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}
