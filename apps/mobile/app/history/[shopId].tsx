import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Patrol } from '@/api/types';
import type { PatrolStatusFilter } from '@/features/history/patrol-filters';
import { PatrolHistoryControls } from '@/features/history/PatrolHistoryControls';
import {
  patrolPeriodFrom,
  type PatrolPeriodFilter,
} from '@/features/history/patrol-period-filter';
import { PatrolCard } from '@/features/history/PatrolCard';
import { useInfiniteShopPatrols } from '@/features/history/queries';
import { useShop } from '@/features/route-setup/queries';
import { colors, screenInsets, spacing } from '@/theme';
import { AppText, Button, DataStatusBar, EmptyState, Header, ListFooter, Screen } from '@/ui';

export default function ShopHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data: shop } = useShop(shopId);
  const [period, setPeriod] = useState<PatrolPeriodFilter>('30d');
  const [status, setStatus] = useState<PatrolStatusFilter>('all');
  const [sort, setSort] = useState('startedAt:desc');
  const from = useMemo(() => patrolPeriodFrom(period), [period]);

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
  } = useInfiniteShopPatrols(shopId, {
    from,
    status: status === 'all' ? undefined : status,
    sort,
  });

  const total = data?.pages[0]?.total ?? 0;
  const hasInitialError = isError && data === undefined;
  const hasRefreshError = isError && data !== undefined;
  const openPatrol = useCallback(
    (patrol: Patrol) => router.push({ pathname: '/history/patrol/[id]', params: { id: patrol.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="История обходов"
          subtitle={shop?.name}
          onBack={() => router.back()}
        />
        <PatrolHistoryControls
          compact
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
          style={styles.listView}
          data={items}
          keyExtractor={(patrol) => patrol.id}
          contentContainerStyle={styles.list}
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
              icon="document-text-outline"
              title="Обходов за выбранный период нет"
              description="Измените период или статус обхода."
            />
          }
          renderItem={({ item }) => (
            <PatrolCard patrol={item} context="shop" timezone={shop?.timezone} onPress={openPatrol} />
          )}
        />
      )}
      {!isPending && !hasInitialError ? (
        <View style={styles.footer}>
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            isRefreshing={isRefetching}
            onRefresh={() => void refetch()}
            updatedAt={dataUpdatedAt}
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
  summaryBar: {
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
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.listTop,
    paddingBottom: screenInsets.listBottom,
  },
  listView: {
    flex: 1,
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
