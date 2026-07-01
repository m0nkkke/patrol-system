import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Patrol } from '@/api/types';
import {
  PATROL_SORT_OPTIONS,
  PATROL_STATUS_OPTIONS,
  type PatrolStatusFilter,
} from '@/features/history/patrol-filters';
import { PatrolCard } from '@/features/history/PatrolCard';
import { useInfiniteShopPatrols } from '@/features/history/queries';
import { useShop } from '@/features/route-setup/queries';
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
} from '@/ui';

export default function ShopHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data: shop } = useShop(shopId);
  const [status, setStatus] = useState<PatrolStatusFilter>('all');
  const [sort, setSort] = useState('startedAt:desc');

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
  } = useInfiniteShopPatrols(shopId, { status: status === 'all' ? undefined : status, sort });

  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Статус',
      options: PATROL_STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as PatrolStatusFilter),
    },
  ];

  const openPatrol = useCallback(
    (patrol: Patrol) => router.push({ pathname: '/history/patrol/[id]', params: { id: patrol.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header title="История обходов" subtitle={shop?.name} onBack={() => router.back()} />
        <FilterSortBar>
          <FilterSheet groups={filterGroups} activeCount={status === 'all' ? 0 : 1} />
          <SheetButton
            label="Сортировать"
            icon="swap-vertical-outline"
            title="Сортировка"
            options={PATROL_SORT_OPTIONS}
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
          ListEmptyComponent={<AppText muted>Обходов пока нет.</AppText>}
          renderItem={({ item }) => (
            <PatrolCard patrol={item} showEmployee timezone={shop?.timezone} onPress={openPatrol} />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
