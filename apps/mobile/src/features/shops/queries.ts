import type { CreateShopDto } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createShop, getAssignedMobileShops } from '@/api/shops.api';

export function useAssignedMobileShops(enabled = true) {
  return useQuery({
    queryKey: ['mobile-assigned-shops'],
    queryFn: getAssignedMobileShops,
    enabled,
  });
}

export function useCreateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShopDto) => createShop(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shops'] });
      void queryClient.invalidateQueries({ queryKey: ['shops-infinite'] });
    },
  });
}
