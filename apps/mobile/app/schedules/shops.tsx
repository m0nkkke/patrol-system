import { useRouter } from 'expo-router';

import { ShopActionPickerScreen } from '@/features/shops/ShopActionPickerScreen';

export default function ScheduleShopPickerScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <ShopActionPickerScreen
      subtitle="Выберите магазин для настройки расписаний"
      onBack={() => router.back()}
      onSelect={(shop) =>
        router.push({ pathname: '/schedules/[shopId]', params: { shopId: shop.id } })
      }
    />
  );
}
