import type { AnonymousAppealStatus } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAnonymousAppeal,
  getAnonymousAppeal,
  getAnonymousAppeals,
  type AnonymousAppeal,
  type AnonymousAppealFilters,
  updateAnonymousAppeal,
} from '@/api/anonymous.api';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

export function useCreateAnonymousAppeal() {
  return useMutation({ mutationFn: createAnonymousAppeal });
}

export function useInfiniteAnonymousAppeals(filters: AnonymousAppealFilters) {
  const search = filters.search?.trim() || undefined;
  return useInfinitePaginated<AnonymousAppeal>(
    [
      'anonymous-appeals-infinite',
      filters.category ?? 'all',
      filters.status ?? 'all',
      filters.shopId ?? 'all',
      search ?? '',
      filters.from ?? '',
      filters.to ?? '',
      filters.sort ?? 'createdAt:desc',
    ],
    (page) =>
      getAnonymousAppeals({
        ...filters,
        search,
        page,
        limit: PAGE_SIZE,
      }),
  );
}

export function useAnonymousAppeal(appealId: string) {
  return useQuery({
    queryKey: ['anonymous-appeal', appealId],
    queryFn: () => getAnonymousAppeal(appealId),
    enabled: appealId.length > 0,
  });
}

export function useUpdateAnonymousAppeal(appealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: AnonymousAppealStatus) => updateAnonymousAppeal(appealId, { status }),
    onSuccess: (appeal) => {
      queryClient.setQueryData(['anonymous-appeal', appealId], appeal);
      void queryClient.invalidateQueries({ queryKey: ['anonymous-appeals-infinite'] });
    },
  });
}
