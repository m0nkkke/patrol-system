import type { PatrolPeriod } from '@patrol/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useShopPatrolRoutes } from '@/features/patrol-routes/queries';
import { useShop } from '@/features/route-setup/queries';
import { ScheduleCard } from '@/features/schedules/ScheduleCard';
import { useShopSchedules } from '@/features/schedules/queries';
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
  Screen,
  SearchField,
  SheetButton,
  type SheetButtonOption,
} from '@/ui';

type StatusFilter = 'all' | 'active' | 'inactive';
type PeriodFilter = 'all' | PatrolPeriod;
type ScheduleSort = 'active' | 'time:asc' | 'time:desc' | 'name:asc' | 'name:desc';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Отключенные' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Все периоды' },
  { value: 'morning', label: 'Утро' },
  { value: 'noon', label: 'День' },
  { value: 'evening', label: 'Вечер' },
];

const SORT_OPTIONS: SheetButtonOption<ScheduleSort>[] = [
  { value: 'active', label: 'Сначала активные' },
  { value: 'time:asc', label: 'По времени: раньше' },
  { value: 'time:desc', label: 'По времени: позже' },
  { value: 'name:asc', label: 'Название (А–Я)' },
  { value: 'name:desc', label: 'Название (Я–А)' },
];

export default function ShopSchedulesScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [sort, setSort] = useState<ScheduleSort>('active');
  const shopQuery = useShop(shopId);
  const { data, dataUpdatedAt, isPending, isError, error, refetch, isRefetching } =
    useShopSchedules(shopId);
  const routesQuery = useShopPatrolRoutes(shopId);
  const routeNames = useMemo(
    () => new Map((routesQuery.data ?? []).map((route) => [route.id, route.name])),
    [routesQuery.data],
  );
  const schedules = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU');
    const filtered = (data ?? []).filter((schedule) => {
      const routeName = schedule.routeId ? routeNames.get(schedule.routeId) ?? '' : '';
      const matchesSearch =
        normalizedSearch.length === 0 ||
        schedule.name.toLocaleLowerCase('ru-RU').includes(normalizedSearch) ||
        routeName.toLocaleLowerCase('ru-RU').includes(normalizedSearch);
      const matchesStatus =
        status === 'all' || (status === 'active' ? schedule.isActive : !schedule.isActive);
      const matchesPeriod = period === 'all' || schedule.period === period;
      return matchesSearch && matchesStatus && matchesPeriod;
    });

    return [...filtered].sort((left, right) => {
      if (sort === 'active') {
        const active = Number(right.isActive) - Number(left.isActive);
        if (active !== 0) {
          return active;
        }
        return left.startTime.localeCompare(right.startTime);
      }
      if (sort === 'time:asc' || sort === 'time:desc') {
        const comparison = left.startTime.localeCompare(right.startTime);
        return sort === 'time:asc' ? comparison : -comparison;
      }
      const comparison = left.name.localeCompare(right.name, 'ru-RU');
      return sort === 'name:asc' ? comparison : -comparison;
    });
  }, [data, period, routeNames, search, sort, status]);
  const activeFilterCount = Number(status !== 'all') + Number(period !== 'all');
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const pending = isPending || shopQuery.isPending || routesQuery.isPending;
  const hasInitialError =
    (isError && data === undefined) ||
    (shopQuery.isError && shopQuery.data === undefined) ||
    (routesQuery.isError && routesQuery.data === undefined);
  const hasRefreshError =
    (isError && data !== undefined) ||
    (shopQuery.isError && shopQuery.data !== undefined) ||
    (routesQuery.isError && routesQuery.data !== undefined);
  const refreshing = isRefetching || shopQuery.isRefetching || routesQuery.isRefetching;
  const updatedAt = Math.min(
    dataUpdatedAt || Number.MAX_SAFE_INTEGER,
    shopQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
    routesQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
  );
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as StatusFilter),
    },
    {
      title: 'Период',
      options: PERIOD_OPTIONS,
      value: period,
      onChange: (value) => setPeriod(value as PeriodFilter),
    },
  ];

  function openSchedule(scheduleId: string): void {
    router.push({ pathname: '/schedules/[shopId]/[id]', params: { shopId, id: scheduleId } });
  }

  function refresh(): void {
    void refetch();
    void shopQuery.refetch();
    void routesQuery.refetch();
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Расписания"
          subtitle={shopQuery.data?.name ?? 'Расписания выбранного магазина'}
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по расписанию или маршруту"
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
        <AppText variant="caption" muted style={styles.count}>
          Показано: {schedules.length} из {data?.length ?? 0}
        </AppText>
      </View>

      {pending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(error ?? shopQuery.error ?? routesQuery.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={refresh} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={schedules}
          keyExtractor={(schedule) => schedule.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={data?.length ? 'Расписания не найдены' : 'Расписаний пока нет'}
              description={
                data?.length
                  ? 'Измените поиск или выбранные фильтры.'
                  : 'Создайте расписание для активного маршрута магазина.'
              }
            />
          }
          renderItem={({ item }) => (
            <ScheduleCard
              schedule={item}
              routeName={item.routeId ? routeNames.get(item.routeId) : undefined}
              onPress={() => openSchedule(item.id)}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        {!pending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={updatedAt === Number.MAX_SAFE_INTEGER ? 0 : updatedAt}
            isRefreshing={refreshing}
            onRefresh={refresh}
          />
        ) : null}
        <View style={styles.addButton}>
          <Button
            label="Добавить расписание"
            icon="add-outline"
            onPress={() => router.push({ pathname: '/schedules/[shopId]/new', params: { shopId } })}
          />
        </View>
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
    paddingBottom: screenInsets.actionFooterBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.actionFooterTop,
  },
  count: {
    marginTop: spacing.md,
  },
  addButton: {
    marginTop: spacing.sm,
  },
});
