import type { PatrolStatus } from '@patrol/shared';
import { useQuery } from '@tanstack/react-query';

import { getShopRoutePoints } from '@/api/patrol-points.api';
import { getEmployeePatrols, getPatrol, getShopPatrols } from '@/api/patrols.api';
import type { Patrol } from '@/api/types';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

type PatrolListParams = { status?: PatrolStatus; sort?: string };

export function useInfiniteShopPatrols(shopId: string, params: PatrolListParams) {
  return useInfinitePaginated<Patrol>(
    ['shop-patrols-infinite', shopId, params.status ?? 'all', params.sort ?? 'startedAt:desc'],
    (page) => getShopPatrols(shopId, { page, limit: PAGE_SIZE, status: params.status, sort: params.sort }),
  );
}

export function useInfiniteEmployeePatrols(employeeId: string, params: PatrolListParams) {
  return useInfinitePaginated<Patrol>(
    [
      'employee-patrols-infinite',
      employeeId,
      params.status ?? 'all',
      params.sort ?? 'startedAt:desc',
    ],
    (page) =>
      getEmployeePatrols(employeeId, {
        page,
        limit: PAGE_SIZE,
        status: params.status,
        sort: params.sort,
      }),
  );
}

export function usePatrol(patrolId: string) {
  return useQuery({
    queryKey: ['patrol', patrolId],
    queryFn: () => getPatrol(patrolId),
  });
}

export function useEmployeePatrols(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-patrols', employeeId],
    queryFn: () => getEmployeePatrols(employeeId ?? ''),
    enabled: Boolean(employeeId),
  });
}

export function usePatrolPoints(shopId: string | undefined) {
  return useQuery({
    queryKey: ['patrol-points', shopId],
    queryFn: () => getShopRoutePoints(shopId ?? ''),
    enabled: Boolean(shopId),
  });
}
