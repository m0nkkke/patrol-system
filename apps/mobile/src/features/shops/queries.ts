import type { CreateShopDto } from '@patrol/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createShop } from '@/api/shops.api';

export function useCreateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateShopDto) => createShop(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });
}
