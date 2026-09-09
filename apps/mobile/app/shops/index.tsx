import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { useInfiniteShops } from '@/features/route-setup/queries';
import { ShopCard } from '@/features/shops/ShopCard';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  DataStatusBar,
  EmptyState,
  FilterSheet,
  type FilterSheetGroup,
  FilterSortBar,
  Header,
  ListFooter,
  Screen,
  SheetButton,
  type SheetButtonOption,
  SearchField,
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
    data,
    dataUpdatedAt,
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

  const total = data?.pages[0]?.total ?? items.length;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const hasInitialError = isError && data === undefined;
  const hasRefreshError = isError && data !== undefined;

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
        <Header
          title="Магазины"
          subtitle={`Всего магазинов: ${total}`}
          onBack={() => router.back()}
          titleAction={{
            accessibilityLabel: 'Добавить магазин',
            icon: 'add-circle-outline',
            onPress: () => router.navigate('/shops/new'),
          }}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию или ID магазина"
        />
        <FilterSortBar>
          <FilterSheet
            groups={filterGroups}
            label="Фильтр"
            activeCount={status === 'all' ? 0 : 1}
            showActiveCount
          />
          <SheetButton
            label="Сортировка"
            detail={sortLabel}
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
      ) : hasInitialError ? (
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
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title="Магазины не найдены"
              description="Измените поисковый запрос или выбранный фильтр."
            />
          }
          renderItem={({ item }) => (
            <ShopCard shop={item} onPress={openShop} showStatus={false} showActive />
          )}
        />
      )}

      <View style={styles.footer}>
        {!isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={dataUpdatedAt}
            isRefreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenInsets.horizontal,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.listTop,
    paddingBottom: screenInsets.listBottom,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: screenInsets.footerBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.footerTop,
  },
});
