import { useQuery } from '@tanstack/react-query';

import {
  getControlPatrol,
  getControlPatrols,
  type ControlPatrolFilters,
  type ControlPatrolSummary,
} from '@/api/control-patrols.api';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

export function useInfiniteControlPatrols(filters: ControlPatrolFilters) {
  const search = filters.search?.trim() || undefined;
  return useInfinitePaginated<ControlPatrolSummary>(
    [
      'control-patrols-infinite',
      filters.shopId ?? 'all',
      filters.employeeId ?? 'all',
      filters.routeId ?? 'all',
      filters.status ?? 'all',
      filters.from ?? '',
      filters.to ?? '',
      search ?? '',
      filters.sort ?? 'startedAt:desc',
    ],
    (page) =>
      getControlPatrols({
        ...filters,
        search,
        page,
        limit: PAGE_SIZE,
      }),
  );
}

export function useControlPatrol(patrolId: string) {
  return useQuery({
    queryKey: ['control-patrol', patrolId],
    queryFn: () => getControlPatrol(patrolId),
    enabled: patrolId.length > 0,
  });
}
