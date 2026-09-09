import type { CreatePatrolRouteDto, UpdatePatrolRouteDto } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archivePatrolRoute,
  createPatrolRoute,
  getPatrolRoute,
  getPatrolRouteVersions,
  getShopPatrolRoutes,
  updatePatrolRoute,
} from '@/api/patrol-routes.api';
import { getShopRoutePoints } from '@/api/patrol-points.api';

export function shopPatrolRoutesKey(shopId: string): [string, string] {
  return ['shop-patrol-routes', shopId];
}

export function useShopPatrolRoutes(shopId: string) {
  return useQuery({
    queryKey: shopPatrolRoutesKey(shopId),
    queryFn: () => getShopPatrolRoutes(shopId),
  });
}

export function usePatrolRoute(routeId: string) {
  return useQuery({
    queryKey: ['patrol-route', routeId],
    queryFn: () => getPatrolRoute(routeId),
  });
}

export function usePatrolRouteVersions(routeId: string) {
  return useQuery({
    queryKey: ['patrol-route-versions', routeId],
    queryFn: () => getPatrolRouteVersions(routeId),
    enabled: routeId.length > 0,
  });
}

export function useShopPatrolPoints(shopId: string) {
  return useQuery({
    queryKey: ['shop-patrol-points', shopId],
    queryFn: () => getShopRoutePoints(shopId),
  });
}

export function useCreatePatrolRoute(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePatrolRouteDto) => createPatrolRoute(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopPatrolRoutesKey(shopId) });
      invalidateShopStatus(queryClient, shopId);
    },
  });
}

export function useUpdatePatrolRoute(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePatrolRouteDto }) =>
      updatePatrolRoute(id, payload),
    onSuccess: (route, variables) => {
      queryClient.setQueryData(['patrol-route', variables.id], route);
      void queryClient.invalidateQueries({ queryKey: shopPatrolRoutesKey(shopId) });
      void queryClient.invalidateQueries({ queryKey: ['patrol-route-versions', variables.id] });
      invalidateShopStatus(queryClient, shopId);
    },
  });
}

export function useArchivePatrolRoute(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) => archivePatrolRoute(routeId),
    onSuccess: (route, routeId) => {
      queryClient.setQueryData(['patrol-route', routeId], route);
      void queryClient.invalidateQueries({ queryKey: shopPatrolRoutesKey(shopId) });
      void queryClient.invalidateQueries({ queryKey: ['patrol-route-versions', routeId] });
      invalidateShopStatus(queryClient, shopId);
    },
  });
}

function invalidateShopStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  shopId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
  void queryClient.invalidateQueries({ queryKey: ['shops'] });
  void queryClient.invalidateQueries({ queryKey: ['shops-infinite'] });
  void queryClient.invalidateQueries({ queryKey: ['mobile-assigned-shops'] });
}
