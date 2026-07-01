import type {
  BindRoutePointNfcDto,
  RouteStatus,
  StartRouteSetupDto,
  UpdateShopDto,
} from '@patrol/shared';
import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getRouteSetup,
  resetRouteSetup,
  scanRoutePoint,
  startRouteSetup,
} from '@/api/route-setup.api';
import { getShop, getShops, updateShop } from '@/api/shops.api';
import type { Shop } from '@/api/types';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

const SHOPS_KEY = ['shops'] as const;
const SHOPS_INFINITE_KEY = ['shops-infinite'] as const;

function routeSetupKey(shopId: string): [string, string] {
  return ['route-setup', shopId];
}

function invalidateShopLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: SHOPS_KEY });
  void queryClient.invalidateQueries({ queryKey: SHOPS_INFINITE_KEY });
}

export function useInfiniteShops(params: {
  search?: string;
  routeStatus?: RouteStatus;
  isActive?: boolean;
  sort?: string;
}) {
  const search = params.search?.trim() || undefined;
  return useInfinitePaginated<Shop>(
    [
      ...SHOPS_INFINITE_KEY,
      params.isActive === undefined ? 'all' : String(params.isActive),
      search ?? '',
      params.routeStatus ?? 'all',
      params.sort ?? 'name:asc',
    ],
    (page) =>
      getShops({
        page,
        limit: PAGE_SIZE,
        search,
        routeStatus: params.routeStatus,
        isActive: params.isActive,
        sort: params.sort,
      }),
  );
}

export function useShopsByIds(shopIds: string[]): Shop[] {
  const results = useQueries({
    queries: shopIds.map((id) => ({
      queryKey: ['shop', id],
      queryFn: () => getShop(id),
    })),
  });
  return results.map((result) => result.data).filter((shop): shop is Shop => Boolean(shop));
}

export function useShop(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => getShop(shopId as string),
    enabled: Boolean(shopId),
  });
}

export function useUpdateShop(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateShopDto) => updateShop(shopId, payload),
    onSuccess: (shop) => {
      queryClient.setQueryData(['shop', shopId], shop);
      invalidateShopLists(queryClient);
    },
  });
}

export function useRouteSetup(shopId: string) {
  return useQuery({
    queryKey: routeSetupKey(shopId),
    queryFn: () => getRouteSetup(shopId),
  });
}

export function useStartRouteSetup(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartRouteSetupDto) => startRouteSetup(shopId, payload),
    onSuccess: (state) => {
      queryClient.setQueryData(routeSetupKey(shopId), state);
      invalidateShopLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
    },
  });
}

export function useScanRoutePoint(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BindRoutePointNfcDto) => scanRoutePoint(shopId, payload),
    onSuccess: (state) => {
      queryClient.setQueryData(routeSetupKey(shopId), state);
      invalidateShopLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
    },
  });
}

export function useResetRouteSetup(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetRouteSetup(shopId),
    onSuccess: (state) => {
      queryClient.setQueryData(routeSetupKey(shopId), state);
      invalidateShopLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
    },
  });
}
