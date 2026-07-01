import { type QueryKey, useInfiniteQuery } from '@tanstack/react-query';

import type { Paginated } from './types';

export const PAGE_SIZE = 30;

export function useInfinitePaginated<T>(
  queryKey: QueryKey,
  fetchPage: (page: number) => Promise<Paginated<T>>,
  options?: { enabled?: boolean },
) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length === 0) {
        return undefined;
      }
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: options?.enabled,
  });

  const items = (query.data?.pages ?? []).flatMap((page) => page.items);

  return { ...query, items };
}
