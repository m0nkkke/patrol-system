import type { PatrolStatus } from '@patrol/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { ControlPatrolSummary } from '@/api/control-patrols.api';
import { describeError } from '@/api/error-messages';
import { ControlPatrolCard } from '@/features/control-patrols/ControlPatrolCard';
import { useInfiniteControlPatrols } from '@/features/control-patrols/queries';
import type { PatrolStatusFilter } from '@/features/history/patrol-filters';
import { PatrolHistoryControls } from '@/features/history/PatrolHistoryControls';
import {
  patrolPeriodFrom,
  type PatrolPeriodFilter,
} from '@/features/history/patrol-period-filter';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  DataStatusBar,
  EmptyState,
  Header,
  ListFooter,
  Screen,
  SearchField,
} from '@/ui';

export default function ControlPatrolsScreen(): React.ReactElement {
  const router = useRouter();
  const { employeeId, employeeName, shopId, shopName } = useLocalSearchParams<{
    employeeId?: string;
    employeeName?: string;
    shopId?: string;
    shopName?: string;
  }>();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PatrolPeriodFilter>('all');
  const [status, setStatus] = useState<PatrolStatusFilter>('all');
  const [sort, setSort] = useState('startedAt:desc');
  const debouncedSearch = useDebouncedValue(search);
  const from = useMemo(() => patrolPeriodFrom(period), [period]);
  const patrols = useInfiniteControlPatrols({
    employeeId,
    from,
    search: debouncedSearch,
    shopId,
    status: status === 'all' ? undefined : (status as PatrolStatus),
    sort,
  });
  const openPatrol = useCallback(
    (patrol: ControlPatrolSummary) =>
      router.push({ pathname: '/control-patrols/[id]', params: { id: patrol.id } }),
    [router],
  );
  const total = patrols.data?.pages[0]?.total ?? 0;
  const hasInitialError = patrols.isError && patrols.data === undefined;
  const hasRefreshError = patrols.isError && patrols.data !== undefined;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="История обходов"
          subtitle={
            employeeName
              ? `Сотрудник: ${employeeName}`
              : shopName
                ? `Магазин: ${shopName}`
                : 'Все обходы по всем магазинам'
          }
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Магазин, сотрудник или маршрут"
        />
        <PatrolHistoryControls
          period={period}
          status={status}
          sort={sort}
          onPeriodChange={setPeriod}
          onStatusChange={setStatus}
          onSortChange={setSort}
        />
        <View style={styles.summaryBar}>
          <AppText variant="caption">Найдено: {total}</AppText>
        </View>
      </View>

      {patrols.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(patrols.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void patrols.refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={patrols.items}
          keyExtractor={(patrol) => patrol.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={patrols.isRefetching}
              onRefresh={() => void patrols.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (patrols.hasNextPage && !patrols.isFetchingNextPage) {
              void patrols.fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={patrols.isFetchingNextPage} />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Обходы не найдены"
              description="Измените поиск, период или выбранные фильтры."
            />
          }
          renderItem={({ item }) => <ControlPatrolCard patrol={item} onPress={openPatrol} />}
        />
      )}

      <View style={styles.footer}>
        {!patrols.isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={patrols.dataUpdatedAt}
            isRefreshing={patrols.isRefetching}
            onRefresh={() => void patrols.refetch()}
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
  list: {
    flex: 1,
  },
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
