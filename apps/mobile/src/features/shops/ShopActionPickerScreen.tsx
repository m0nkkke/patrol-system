import type { RouteStatus } from '@patrol/shared';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { useInfiniteShops } from '@/features/route-setup/queries';
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
  SearchField,
  SheetButton,
  type SheetButtonOption,
} from '@/ui';

import { ShopCard } from './ShopCard';

type StatusFilter = RouteStatus | 'all';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'ready', label: 'Готов' },
  { value: 'setup_in_progress', label: 'Настраивается' },
  { value: 'not_configured', label: 'Не настроен' },
];

const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'name:asc', label: 'Название (А–Я)' },
  { value: 'name:desc', label: 'Название (Я–А)' },
  { value: 'createdAt:desc', label: 'Сначала новые' },
];

type ShopActionPickerScreenProps = {
  onBack: () => void;
  onSelect: (shop: Shop) => void;
  showPoints?: boolean;
  showRouteStatus?: boolean;
  subtitle: string;
  title?: string;
};

export function ShopActionPickerScreen({
  onBack,
  onSelect,
  showPoints = false,
  showRouteStatus = false,
  subtitle,
  title = 'Выберите магазин',
}: ShopActionPickerScreenProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState('name:asc');
  const debouncedSearch = useDebouncedValue(search);
  const query = useInfiniteShops({
    search: debouncedSearch,
    routeStatus: showRouteStatus && status !== 'all' ? status : undefined,
    isActive: true,
    sort,
  });
  const total = query.data?.pages[0]?.total ?? query.items.length;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Статус настройки',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as StatusFilter),
    },
  ];

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header compact title={title} subtitle={subtitle} onBack={onBack} />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию или ID магазина"
        />
        <FilterSortBar>
          {showRouteStatus ? (
            <FilterSheet
              groups={filterGroups}
              label="Фильтр"
              activeCount={Number(status !== 'all')}
              showActiveCount
            />
          ) : null}
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
        <AppText variant="caption" muted style={styles.count}>
          Всего магазинов: {total}
        </AppText>
      </View>

      {query.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : query.isError && query.data === undefined ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(query.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={query.items}
          keyExtractor={(shop) => shop.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={query.isFetchingNextPage} />}
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title="Магазины не найдены"
              description="Измените поисковый запрос или выбранный фильтр."
            />
          }
          renderItem={({ item }) => (
            <ShopCard
              shop={item}
              onPress={onSelect}
              showPoints={showPoints}
              showStatus={showRouteStatus}
            />
          )}
        />
      )}

      {!query.isPending && !(query.isError && query.data === undefined) ? (
        <View style={styles.footer}>
          <DataStatusBar
            hasRefreshError={query.isError && query.data !== undefined}
            isRefreshing={query.isRefetching}
            updatedAt={query.dataUpdatedAt}
            onRefresh={() => void query.refetch()}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  count: {
    marginTop: spacing.md,
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
    flexGrow: 1,
    paddingBottom: screenInsets.listBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.listTop,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: screenInsets.footerBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.footerTop,
  },
});
