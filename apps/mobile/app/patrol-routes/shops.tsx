import { useRouter } from 'expo-router';

import { ShopActionPickerScreen } from '@/features/shops/ShopActionPickerScreen';

export default function PatrolRouteShopPickerScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <ShopActionPickerScreen
      subtitle="Выберите магазин для настройки маршрутов и точек"
      showPoints
      showRouteStatus
      onBack={() => router.back()}
      onSelect={(shop) =>
        router.push({ pathname: '/patrol-routes/[shopId]', params: { shopId: shop.id } })
      }
    />
  );
}
