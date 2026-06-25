import type { BindRoutePointNfcDto, StartRouteSetupDto } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getRouteSetup, scanRoutePoint, startRouteSetup } from '@/api/route-setup.api';
import { getShops } from '@/api/shops.api';

const SHOPS_KEY = ['shops'] as const;

function routeSetupKey(shopId: string): [string, string] {
  return ['route-setup', shopId];
}

export function useShops() {
  return useQuery({
    queryKey: SHOPS_KEY,
    queryFn: () => getShops(),
    select: (page) => page.items,
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
    onSuccess: (state) => queryClient.setQueryData(routeSetupKey(shopId), state),
  });
}

export function useScanRoutePoint(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BindRoutePointNfcDto) => scanRoutePoint(shopId, payload),
    onSuccess: (state) => queryClient.setQueryData(routeSetupKey(shopId), state),
  });
}
