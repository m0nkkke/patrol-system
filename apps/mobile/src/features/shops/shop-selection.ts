import type { Shop } from '@/api/types';

export type ShopSelectionDraft = {
  primaryShopId?: string;
  shops: Shop[];
};

export function toggleShopSelection(
  draft: ShopSelectionDraft,
  shop: Shop,
): ShopSelectionDraft {
  const selected = draft.shops.some((item) => item.id === shop.id);
  if (!selected) {
    return {
      shops: [...draft.shops, shop],
      primaryShopId: draft.primaryShopId ?? shop.id,
    };
  }

  const shops = draft.shops.filter((item) => item.id !== shop.id);
  return {
    shops,
    primaryShopId: draft.primaryShopId === shop.id ? shops[0]?.id : draft.primaryShopId,
  };
}

export function orderPrimaryShop(draft: ShopSelectionDraft): Shop[] {
  if (!draft.primaryShopId) {
    return draft.shops;
  }
  return [
    ...draft.shops.filter((shop) => shop.id === draft.primaryShopId),
    ...draft.shops.filter((shop) => shop.id !== draft.primaryShopId),
  ];
}
