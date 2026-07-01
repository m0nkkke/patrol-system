import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { useInfiniteShops } from '@/features/route-setup/queries';
import { ShopCard } from '@/features/shops/ShopCard';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, spacing } from '@/theme';
import {
  AppText,
  Button,
  FilterSortBar,
  Header,
  ListFooter,
  Screen,
  SheetButton,
  type SheetButtonOption,
  TextField,
} from '@/ui';

const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'name:asc', label: 'Название (А-Я)' },
  { value: 'name:desc', label: 'Название (Я-А)' },
  { value: 'createdAt:desc', label: 'Сначала новые' },
];

export default function HistoryShopPickerScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name:asc');
  const debouncedSearch = useDebouncedValue(search);

  const {
    items,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteShops({ search: debouncedSearch, sort });

  const openHistory = useCallback(
    (shop: Shop) => router.push({ pathname: '/history/[shopId]', params: { shopId: shop.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Выберите магазин"
          subtitle="История обходов по магазину"
          onBack={() => router.back()}
        />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию или ID"
          icon="search"
          tone="control"
        />
        <FilterSortBar>
          <SheetButton
            label="Сортировать"
            icon="swap-vertical-outline"
            title="Сортировка"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
        </FilterSortBar>
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
          data={items}
          keyExtractor={(shop) => shop.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={isFetchingNextPage} />}
          ListEmptyComponent={<AppText muted>Магазины не найдены.</AppText>}
          renderItem={({ item }) => (
            <ShopCard shop={item} onPress={openHistory} showStatus={false} showActive />
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
