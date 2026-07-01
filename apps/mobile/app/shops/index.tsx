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
  FilterSheet,
  type FilterSheetGroup,
  FilterSortBar,
  Header,
  ListFooter,
  Screen,
  SheetButton,
  type SheetButtonOption,
  TextField,
} from '@/ui';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];

const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'isActive:desc', label: 'Сначала активные' },
  { value: 'isActive:asc', label: 'Сначала неактивные' },
  { value: 'name:asc', label: 'Название (А–Я)' },
  { value: 'name:desc', label: 'Название (Я–А)' },
  { value: 'createdAt:desc', label: 'Сначала новые' },
];

export default function ShopsListScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
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
  } = useInfiniteShops({
    search: debouncedSearch,
    isActive: status === 'all' ? undefined : status === 'active',
    sort,
  });

  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as StatusFilter),
    },
  ];

  const openShop = useCallback(
    (shop: Shop) => router.push({ pathname: '/shops/[id]', params: { id: shop.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header title="Магазины" onBack={() => router.back()} />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию или ID"
          icon="search"
          tone="control"
        />
        <FilterSortBar>
          <FilterSheet groups={filterGroups} activeCount={status === 'all' ? 0 : 1} />
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
            <ShopCard shop={item} onPress={openShop} showStatus={false} showActive />
          )}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Создать магазин"
          icon="add-outline"
          onPress={() => router.push('/shops/new')}
        />
      </View>
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
    paddingBottom: spacing.lg,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
