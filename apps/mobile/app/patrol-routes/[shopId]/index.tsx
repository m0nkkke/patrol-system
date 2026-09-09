import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { PatrolRoute } from '@/api/patrol-routes.api';
import type { RoutePoint } from '@/api/types';
import { PatrolPointCard } from '@/features/patrol-points/PatrolPointCard';
import {
  useActivePatrolPoints,
  useArchivedPatrolPoints,
  useRestorePatrolPoint,
} from '@/features/patrol-points/queries';
import { PatrolRouteCard } from '@/features/patrol-routes/PatrolRouteCard';
import { useShopPatrolRoutes } from '@/features/patrol-routes/queries';
import { useShop } from '@/features/route-setup/queries';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AppToast,
  Button,
  DataStatusBar,
  EmptyState,
  FilterSheet,
  type FilterSheetGroup,
  FilterSortBar,
  Header,
  Screen,
  SearchField,
  SegmentedControl,
  SheetButton,
  type SheetButtonOption,
} from '@/ui';

type WorkspaceTab = 'routes' | 'points';
type StatusFilter = 'all' | 'active' | 'archived';
type CategoryFilter = 'all' | 'internal' | 'external';
type NfcFilter = 'all' | 'bound' | 'missing';

const TAB_OPTIONS = [
  { value: 'routes' as const, label: 'Маршруты', icon: 'git-network-outline' as const },
  { value: 'points' as const, label: 'Точки', icon: 'location-outline' as const },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'archived', label: 'В архиве' },
];
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'internal', label: 'Внутренние' },
  { value: 'external', label: 'Внешние' },
];
const NFC_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'bound', label: 'С NFC-меткой' },
  { value: 'missing', label: 'Без NFC-метки' },
];
const ROUTE_SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'active', label: 'Сначала активные' },
  { value: 'name:asc', label: 'Название (А–Я)' },
  { value: 'name:desc', label: 'Название (Я–А)' },
  { value: 'category', label: 'По типу маршрута' },
];
const POINT_SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'active', label: 'Сначала активные' },
  { value: 'name:asc', label: 'Название (А–Я)' },
  { value: 'name:desc', label: 'Название (Я–А)' },
  { value: 'nfc', label: 'Сначала без NFC' },
];

export default function RouteWorkspaceScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId = '', tab: initialTab, status: initialStatus } = useLocalSearchParams<{
    shopId: string;
    tab?: WorkspaceTab;
    status?: StatusFilter;
  }>();
  const [tab, setTab] = useState<WorkspaceTab>(initialTab === 'points' ? 'points' : 'routes');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>(
    initialStatus === 'active' || initialStatus === 'archived' ? initialStatus : 'all',
  );
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [nfc, setNfc] = useState<NfcFilter>('all');
  const [routeSort, setRouteSort] = useState('active');
  const [pointSort, setPointSort] = useState('active');
  const [restoreTarget, setRestoreTarget] = useState<RoutePoint | null>(null);
  const [missingPointsDialogVisible, setMissingPointsDialogVisible] = useState(false);
  const shopQuery = useShop(shopId);
  const routesQuery = useShopPatrolRoutes(shopId);
  const activePointsQuery = useActivePatrolPoints(shopId);
  const archivedPointsQuery = useArchivedPatrolPoints(shopId);
  const restorePoint = useRestorePatrolPoint(shopId);

  const routes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return [...(routesQuery.data ?? [])]
      .filter((route) => {
        const statusMatches =
          status === 'all' || (status === 'active' ? route.isActive : !route.isActive);
        return (
          (!query || route.name.toLocaleLowerCase('ru-RU').includes(query)) &&
          statusMatches &&
          (category === 'all' || route.category === category)
        );
      })
      .sort((left, right) => sortRoutes(left, right, routeSort));
  }, [category, routeSort, routesQuery.data, search, status]);

  const allPoints = useMemo(
    () => [...(activePointsQuery.data ?? []), ...(archivedPointsQuery.data ?? [])],
    [activePointsQuery.data, archivedPointsQuery.data],
  );
  const points = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return allPoints
      .filter((point) => {
        const hasNfc = Boolean(point.nfcTagId ?? point.nfcTag?.id);
        const statusMatches =
          status === 'all' || (status === 'active' ? point.isActive : !point.isActive);
        const nfcMatches = nfc === 'all' || (nfc === 'bound' ? hasNfc : !hasNfc);
        return (
          (!query ||
            point.name.toLocaleLowerCase('ru-RU').includes(query) ||
            point.description?.toLocaleLowerCase('ru-RU').includes(query)) &&
          statusMatches &&
          nfcMatches
        );
      })
      .sort((left, right) => sortPoints(left, right, pointSort));
  }, [allPoints, nfc, pointSort, search, status]);

  const isRoutesTab = tab === 'routes';
  const currentSort = isRoutesTab ? routeSort : pointSort;
  const sortOptions = isRoutesTab ? ROUTE_SORT_OPTIONS : POINT_SORT_OPTIONS;
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as StatusFilter),
    },
    ...(isRoutesTab
      ? [
          {
            title: 'Тип маршрута',
            options: CATEGORY_OPTIONS,
            value: category,
            onChange: (value: string) => setCategory(value as CategoryFilter),
          },
        ]
      : [
          {
            title: 'NFC-метка',
            options: NFC_OPTIONS,
            value: nfc,
            onChange: (value: string) => setNfc(value as NfcFilter),
          },
        ]),
  ];
  const activeFilterCount =
    Number(status !== 'all') + Number(isRoutesTab ? category !== 'all' : nfc !== 'all');
  const sortLabel = sortOptions.find((option) => option.value === currentSort)?.label ?? '';
  const currentQueries = isRoutesTab
    ? [routesQuery]
    : [activePointsQuery, archivedPointsQuery];
  const isPending = shopQuery.isPending || currentQueries.some((query) => query.isPending);
  const hasInitialError =
    (shopQuery.isError && shopQuery.data === undefined) ||
    currentQueries.some((query) => query.isError && query.data === undefined);
  const hasRefreshError =
    (shopQuery.isError && shopQuery.data !== undefined) ||
    currentQueries.some((query) => query.isError && query.data !== undefined);
  const isRefreshing =
    shopQuery.isRefetching || currentQueries.some((query) => query.isRefetching);
  const updatedAt = Math.min(
    shopQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
    ...currentQueries.map((query) => query.dataUpdatedAt || Number.MAX_SAFE_INTEGER),
  );

  const refresh = useCallback(() => {
    void shopQuery.refetch();
    if (tab === 'routes') {
      void routesQuery.refetch();
    } else {
      void activePointsQuery.refetch();
      void archivedPointsQuery.refetch();
    }
  }, [activePointsQuery, archivedPointsQuery, routesQuery, shopQuery, tab]);

  const openRoute = useCallback(
    (route: PatrolRoute) =>
      router.push({
        pathname: '/patrol-routes/[shopId]/[id]',
        params: { shopId, id: route.id },
      }),
    [router, shopId],
  );
  const openPoint = useCallback(
    (point: RoutePoint) => {
      if (!point.isActive) {
        setRestoreTarget(point);
        return;
      }
      router.push({ pathname: '/route-setup/point/[id]', params: { shopId, id: point.id } });
    },
    [router, shopId],
  );

  function changeTab(value: WorkspaceTab): void {
    setTab(value);
    setSearch('');
    setStatus('all');
  }

  const error =
    shopQuery.error ??
    currentQueries.find((query) => query.isError)?.error;
  const total = isRoutesTab ? routesQuery.data?.length ?? 0 : allPoints.length;

  return (
    <Screen padded={false}>
      <AppToast message={restorePoint.isError ? describeError(restorePoint.error) : null} />
      <AppDialog
        visible={restoreTarget !== null}
        title="Восстановить точку?"
        message={restoreTarget ? `Точка «${restoreTarget.name}» снова станет доступна для маршрутов.` : ''}
        actions={[
          {
            label: 'Восстановить',
            onPress: () => {
              if (!restoreTarget) return;
              restorePoint.mutate(restoreTarget.id, { onSuccess: () => setRestoreTarget(null) });
            },
          },
          { label: 'Отмена', variant: 'ghost', onPress: () => setRestoreTarget(null) },
        ]}
        onClose={() => setRestoreTarget(null)}
      />
      <AppDialog
        visible={missingPointsDialogVisible}
        title="Сначала добавьте точку"
        message="Чтобы создать маршрут, зарегистрируйте хотя бы одну контрольную точку этого магазина и привяжите к ней NFC-метку."
        actions={[
          {
            label: 'Добавить точку',
            onPress: () => {
              setMissingPointsDialogVisible(false);
              router.push({ pathname: '/route-setup/new/[shopId]', params: { shopId } });
            },
          },
          {
            label: 'Отмена',
            variant: 'ghost',
            onPress: () => setMissingPointsDialogVisible(false),
          },
        ]}
        onClose={() => setMissingPointsDialogVisible(false)}
      />
      <View style={styles.header}>
        <Header
          compact
          title="Маршруты и точки"
          subtitle={shopQuery.data?.name ?? 'Магазин'}
          onBack={() => router.back()}
        />
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={changeTab} />
        <View style={styles.search}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder={isRoutesTab ? 'Поиск по названию маршрута' : 'Поиск по названию или описанию точки'}
          />
        </View>
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
            options={sortOptions}
            value={currentSort}
            onChange={isRoutesTab ? setRouteSort : setPointSort}
          />
        </FilterSortBar>
        <View style={styles.resultRow}>
          <AppText variant="caption" muted>
            Показано: {isRoutesTab ? routes.length : points.length} из {total}
          </AppText>
        </View>
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>{describeError(error)}</AppText>
          <Button label="Повторить" variant="secondary" onPress={refresh} />
        </View>
      ) : isRoutesTab ? (
        <FlatList
          style={styles.list}
          data={routes}
          keyExtractor={(route) => route.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyList hasData={Boolean(routesQuery.data?.length)} kind="routes" />}
          renderItem={({ item }) => <PatrolRouteCard route={item} onPress={openRoute} />}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={points}
          keyExtractor={(point) => point.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyList hasData={allPoints.length > 0} kind="points" />}
          renderItem={({ item }) => (
            <PatrolPointCard
              point={item}
              onPress={openPoint}
              trailingIcon={item.isActive ? 'chevron-forward' : 'refresh-outline'}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        {!isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            isRefreshing={isRefreshing}
            updatedAt={updatedAt === Number.MAX_SAFE_INTEGER ? 0 : updatedAt}
            onRefresh={refresh}
          />
        ) : null}
        <Button
          label={isRoutesTab ? 'Создать маршрут' : 'Добавить точку'}
          icon="add-outline"
          onPress={() => {
            if (isRoutesTab) {
              if (activePointsQuery.data !== undefined && activePointsQuery.data.length === 0) {
                setMissingPointsDialogVisible(true);
                return;
              }
              router.push({ pathname: '/patrol-routes/[shopId]/new', params: { shopId } });
              return;
            }
            router.push({ pathname: '/route-setup/new/[shopId]', params: { shopId } });
          }}
        />
      </View>
    </Screen>
  );
}

function EmptyList({ hasData, kind }: { hasData: boolean; kind: WorkspaceTab }): React.ReactElement {
  return (
    <EmptyState
      icon={kind === 'routes' ? 'git-network-outline' : 'location-outline'}
      title={
        hasData ? 'Ничего не найдено' : kind === 'routes' ? 'Маршрутов пока нет' : 'Точек пока нет'
      }
      description={
        hasData
          ? 'Измените поиск или выбранные фильтры.'
          : kind === 'routes'
            ? 'Соберите маршрут из зарегистрированных контрольных точек.'
            : 'Добавьте первую точку и привяжите к ней NFC-метку.'
      }
    />
  );
}

function sortRoutes(left: PatrolRoute, right: PatrolRoute, sort: string): number {
  if (sort === 'name:asc') return left.name.localeCompare(right.name, 'ru-RU');
  if (sort === 'name:desc') return right.name.localeCompare(left.name, 'ru-RU');
  if (sort === 'category') {
    return left.category.localeCompare(right.category) || left.name.localeCompare(right.name, 'ru-RU');
  }
  return Number(right.isActive) - Number(left.isActive) || left.name.localeCompare(right.name, 'ru-RU');
}

function sortPoints(left: RoutePoint, right: RoutePoint, sort: string): number {
  if (sort === 'name:asc') return left.name.localeCompare(right.name, 'ru-RU');
  if (sort === 'name:desc') return right.name.localeCompare(left.name, 'ru-RU');
  if (sort === 'nfc') {
    const leftHasNfc = Boolean(left.nfcTagId ?? left.nfcTag?.id);
    const rightHasNfc = Boolean(right.nfcTagId ?? right.nfcTag?.id);
    return Number(leftHasNfc) - Number(rightHasNfc) || left.name.localeCompare(right.name, 'ru-RU');
  }
  return Number(right.isActive) - Number(left.isActive) || left.name.localeCompare(right.name, 'ru-RU');
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  search: {
    marginTop: spacing.md,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenInsets.horizontal,
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
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingBottom: screenInsets.actionFooterBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.footerTop,
  },
});
