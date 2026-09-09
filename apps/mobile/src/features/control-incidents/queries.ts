import { useQuery } from '@tanstack/react-query';

import {
  getControlIncident,
  getControlIncidents,
  type ControlIncident,
  type ControlIncidentFilters,
} from '@/api/control-incidents.api';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

export function useInfiniteControlIncidents(filters: ControlIncidentFilters) {
  const search = filters.search?.trim() || undefined;
  return useInfinitePaginated<ControlIncident>(
    [
      'control-incidents-infinite',
      filters.shopId ?? 'all',
      filters.employeeId ?? 'all',
      filters.patrolId ?? 'all',
      filters.type ?? 'all',
      filters.severity ?? 'all',
      filters.from ?? '',
      filters.to ?? '',
      search ?? '',
      filters.sort ?? 'createdAt:desc',
    ],
    (page) =>
      getControlIncidents({
        ...filters,
        search,
        page,
        limit: PAGE_SIZE,
      }),
  );
}

export function useControlIncident(incidentId: string) {
  return useQuery({
    queryKey: ['control-incident', incidentId],
    queryFn: () => getControlIncident(incidentId),
    enabled: incidentId.length > 0,
  });
}
