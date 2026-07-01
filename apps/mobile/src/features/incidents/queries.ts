import type { PatrolIncidentType } from '@patrol/shared';

import { getIncidents } from '@/api/incidents.api';
import type { PatrolIncident } from '@/api/types';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

export function useInfiniteIncidents(params: {
  shopId?: string;
  type?: PatrolIncidentType;
  search?: string;
  sort?: string;
}) {
  const search = params.search?.trim() || undefined;
  return useInfinitePaginated<PatrolIncident>(
    [
      'incidents-infinite',
      params.shopId ?? 'all',
      params.type ?? 'all',
      search ?? '',
      params.sort ?? 'createdAt:desc',
    ],
    (page) =>
      getIncidents({
        page,
        limit: PAGE_SIZE,
        shopId: params.shopId,
        type: params.type,
        search,
        sort: params.sort,
      }),
  );
}
