import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import type { Shop } from '@/api/types';
import { ShopCard } from '@/features/shops/ShopCard';
import { useAuthStore } from '@/store/auth-store';
import { screenInsets } from '@/theme';
import { EmptyState, Header, Screen } from '@/ui';

export default function ControlShopsScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const shops = user?.shops ?? (user?.shop ? [user.shop] : []);

  function openShop(shop: Shop): void {
    router.push({ pathname: '/control-shops/[id]', params: { id: shop.id } });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Контроль магазинов"
          subtitle="Сводка по назначенным магазинам за последние 14 дней"
          onBack={() => router.back()}
        />
      </View>
      <FlatList
        data={shops}
        keyExtractor={(shop) => shop.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ShopCard shop={item} showStatus={false} onPress={openShop} />}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title="Нет назначенных магазинов"
            description="Администратор должен назначить проверяющему хотя бы один магазин."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: screenInsets.horizontal, paddingTop: screenInsets.top },
  list: {
    paddingBottom: screenInsets.listBottom,
    paddingHorizontal: screenInsets.horizontal,
  },
});
