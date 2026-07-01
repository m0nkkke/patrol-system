import type { ReplaceNfcTagDto } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getShopRoutePoints, replaceNfcTag } from '@/api/patrol-points.api';

function shopPointsKey(shopId: string): [string, string] {
  return ['patrol-points', shopId];
}

export function useShopPoints(shopId: string) {
  return useQuery({
    queryKey: shopPointsKey(shopId),
    queryFn: () => getShopRoutePoints(shopId),
  });
}

export function useReplaceNfcTag(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pointId, payload }: { pointId: string; payload: ReplaceNfcTagDto }) =>
      replaceNfcTag(pointId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopPointsKey(shopId) }),
  });
}
