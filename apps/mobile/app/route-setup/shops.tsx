import type { RouteStatus } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useShops } from '@/features/route-setup/queries';
import { ShopCard } from '@/features/shops/ShopCard';
import { colors, spacing } from '@/theme';
import { AppText, Button, type FilterOption, FilterChips, Header, Screen, TextField } from '@/ui';

type StatusFilter = RouteStatus | 'all';

const STATUS_FILTERS: FilterOption<StatusFilter>[] = [
  { value: 'all', label: 'Все' },
  { value: 'ready', label: 'Готов' },
  { value: 'setup_in_progress', label: 'Настраивается' },
  { value: 'not_configured', label: 'Не настроен' },
];

export default function RouteSetupShopPickerScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const { data: shops, isPending, isError, error, refetch } = useShops();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (shops ?? [])
      .filter((shop) => {
        const matchesQuery =
          !query ||
          shop.name.toLowerCase().includes(query) ||
          (shop.externalId?.toLowerCase().includes(query) ?? false);
        const matchesStatus = status === 'all' || shop.routeStatus === status;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [shops, search, status]);

  function openShop(shopId: string): void {
    router.push({ pathname: '/route-setup/[shopId]', params: { shopId } });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Выберите магазин"
          subtitle="Магазин, для которого настраиваете маршрут"
          onBack={() => router.back()}
        />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию или ID"
          icon="search"
        />
        <View style={styles.filters}>
          <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </View>
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filtered}
          keyExtractor={(shop) => shop.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<AppText muted>Магазины не найдены.</AppText>}
          renderItem={({ item }) => (
            <ShopCard shop={item} onPress={() => openShop(item.id)} showPoints />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  filters: {
    marginTop: spacing.md,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
