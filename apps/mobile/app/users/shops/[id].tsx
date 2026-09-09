import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import {
  ShopSelectionModal,
  type ShopSelectionResult,
} from '@/features/shops/ShopSelectionModal';
import { useAssignUserShops, useUser } from '@/features/users/queries';
import { AsyncStateScreen } from '@/ui';

export default function EditUserShopsScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const assign = useAssignUserShops(id);
  const [selectedShops, setSelectedShops] = useState<Shop[]>([]);
  const [primaryShopId, setPrimaryShopId] = useState<string | undefined>();
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!user || seeded) {
      return;
    }

    setSelectedShops(user.shops ?? []);
    setPrimaryShopId(user.shopId ?? user.shops?.[0]?.id);
    setSeeded(true);
  }, [seeded, user]);

  if (isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (isError || !user) {
    return (
      <AsyncStateScreen
        message={describeError(error)}
        onBack={() => router.back()}
        onRetry={() => void refetch()}
      />
    );
  }

  function handleApply(result: ShopSelectionResult): void {
    if (assign.isPending) {
      return;
    }

    setSelectedShops(result.shops);
    setPrimaryShopId(result.primaryShopId);
    assign.mutate(
      {
        shopIds: result.shops.map((shop) => shop.id),
        primaryShopId: result.primaryShopId,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <ShopSelectionModal
      visible
      presentation="screen"
      applyLabel="Сохранить"
      applying={assign.isPending}
      errorMessage={assign.isError ? describeError(assign.error) : undefined}
      selectedShops={selectedShops}
      primaryShopId={primaryShopId}
      required
      onApply={handleApply}
      onClose={() => router.back()}
    />
  );
}
