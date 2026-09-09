import { useRouter } from 'expo-router';

import { ShopActionPickerScreen } from '@/features/shops/ShopActionPickerScreen';

export default function RouteSetupShopPickerScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <ShopActionPickerScreen
      subtitle="Выберите магазин для регистрации контрольных точек"
      showPoints
      showRouteStatus
      onBack={() => router.back()}
      onSelect={(shop) =>
        router.push({
          pathname: '/patrol-routes/[shopId]',
          params: { shopId: shop.id, tab: 'points' },
        })
      }
    />
  );
}
