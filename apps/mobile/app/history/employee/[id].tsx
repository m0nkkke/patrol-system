import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Patrol } from '@/api/types';
import type { PatrolStatusFilter } from '@/features/history/patrol-filters';
import { PatrolHistoryControls } from '@/features/history/PatrolHistoryControls';
import { PatrolCard } from '@/features/history/PatrolCard';
import { useInfiniteEmployeePatrols } from '@/features/history/queries';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  DataStatusBar,
  EmptyState,
  Header,
  ListFooter,
  Screen,
} from '@/ui';

export default function EmployeeHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [status, setStatus] = useState<PatrolStatusFilter>('all');
  const [sort, setSort] = useState('startedAt:desc');

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
  } = useInfiniteEmployeePatrols(id, { status: status === 'all' ? undefined : status, sort });
  const hasInitialError = isError && data === undefined;
  const hasRefreshError = isError && data !== undefined;

  const openPatrol = useCallback(
    (patrol: Patrol) => router.push({ pathname: '/history/patrol/[id]', params: { id: patrol.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header compact title="История обходов" subtitle={name} onBack={() => router.back()} />
        <PatrolHistoryControls
          compact
          status={status}
          sort={sort}
          onStatusChange={setStatus}
          onSortChange={setSort}
        />
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
          keyExtractor={(patrol) => patrol.id}
          contentContainerStyle={styles.listContent}
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
              title="Обходов пока нет"
              description="Завершённые и отменённые обходы сотрудника появятся здесь."
            />
          }
          renderItem={({ item }) => <PatrolCard patrol={item} onPress={openPatrol} />}
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
