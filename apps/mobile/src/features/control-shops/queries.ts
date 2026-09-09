import { useQuery } from '@tanstack/react-query';

import { getControlShopOverview } from '@/api/control-shops.api';

export function useControlShopOverview(shopId: string) {
  return useQuery({
    queryKey: ['control-shop-overview', shopId],
    queryFn: () => getControlShopOverview(shopId),
    enabled: shopId.length > 0,
  });
}
