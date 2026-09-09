import type { AnonymousAppealCategory, AnonymousAppealStatus } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { AnonymousAppeal } from '@/api/anonymous.api';
import { describeError } from '@/api/error-messages';
import { AnonymousAppealCard } from '@/features/anonymous/AnonymousAppealCard';
import {
  APPEAL_CATEGORY_LABELS,
  APPEAL_STATUS_LABELS,
} from '@/features/anonymous/format';
import { useInfiniteAnonymousAppeals } from '@/features/anonymous/queries';
import {
  patrolPeriodFrom,
  PATROL_PERIOD_OPTIONS,
  type PatrolPeriodFilter,
} from '@/features/history/patrol-period-filter';
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

type CategoryFilter = AnonymousAppealCategory | 'all';
type StatusFilter = AnonymousAppealStatus | 'all';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Все категории' },
  ...Object.entries(APPEAL_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  ...Object.entries(APPEAL_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];
const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'createdAt:desc', label: 'Сначала новые' },
  { value: 'createdAt:asc', label: 'Сначала старые' },
];

export default function ControlAppealsScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PatrolPeriodFilter>('30d');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState('createdAt:desc');
  const debouncedSearch = useDebouncedValue(search);
  const from = useMemo(() => patrolPeriodFrom(period), [period]);
  const appeals = useInfiniteAnonymousAppeals({
    from,
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch,
    sort,
  });
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Период',
      options: PATROL_PERIOD_OPTIONS,
      value: period,
      onChange: (value) => setPeriod(value as PatrolPeriodFilter),
    },
    {
      title: 'Категория',
      options: CATEGORY_OPTIONS,
      value: category,
      onChange: (value) => setCategory(value as CategoryFilter),
    },
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as StatusFilter),
    },
  ];
  const openAppeal = useCallback(
    (appeal: AnonymousAppeal) =>
      router.push({ pathname: '/control-appeals/[id]', params: { id: appeal.id } }),
    [router],
  );
  const total = appeals.data?.pages[0]?.total ?? 0;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const activeFilterCount =
    Number(period !== 'all') + Number(category !== 'all') + Number(status !== 'all');
  const hasInitialError = appeals.isError && appeals.data === undefined;
  const hasRefreshError = appeals.isError && appeals.data !== undefined;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="Анонимные обращения"
          subtitle="Обращения по доступным магазинам"
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по тексту или магазину"
        />
        <FilterSortBar>
          <FilterSheet
            groups={filterGroups}
            label="Фильтр"
            activeCount={activeFilterCount}
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
        <View style={styles.summaryBar}>
          <AppText variant="caption">Найдено: {total}</AppText>
        </View>
      </View>

      {appeals.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(appeals.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void appeals.refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={appeals.items}
          keyExtractor={(appeal) => appeal.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={appeals.isRefetching}
              onRefresh={() => void appeals.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (appeals.hasNextPage && !appeals.isFetchingNextPage) {
              void appeals.fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={appeals.isFetchingNextPage} />}
          ListEmptyComponent={
            <EmptyState
              icon="mail-unread-outline"
              title="Обращения не найдены"
              description="Измените поиск, период или выбранные фильтры."
            />
          }
          renderItem={({ item }) => <AnonymousAppealCard appeal={item} onPress={openAppeal} />}
        />
      )}

      <View style={styles.footer}>
        {!appeals.isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={appeals.dataUpdatedAt}
            isRefreshing={appeals.isRefetching}
            onRefresh={() => void appeals.refetch()}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: screenInsets.horizontal, paddingTop: screenInsets.top },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenInsets.horizontal,
  },
  errorText: { marginBottom: spacing.lg, textAlign: 'center' },
  summaryBar: {
    marginTop: spacing.md,
  },
  list: { flex: 1 },
  listContent: {
    paddingBottom: screenInsets.listBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.listTop,
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
