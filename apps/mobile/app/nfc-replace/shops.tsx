import { useRouter } from 'expo-router';

import { ShopActionPickerScreen } from '@/features/shops/ShopActionPickerScreen';

export default function NfcReplaceShopPickerScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <ShopActionPickerScreen
      subtitle="Выберите магазин, в котором меняете NFC-метку"
      onBack={() => router.back()}
      onSelect={(shop) =>
        router.push({ pathname: '/nfc-replace/[shopId]', params: { shopId: shop.id } })
      }
    />
  );
}
