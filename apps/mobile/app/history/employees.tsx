import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { AdminUser } from '@/api/types';
import { useInfiniteUsers } from '@/features/users/queries';
import { UserCard } from '@/features/users/UserCard';
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

export default function HistoryEmployeesScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
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
  } = useInfiniteUsers({ search: debouncedSearch, role: 'security_guard', sort: 'fullName:asc' });
  const hasInitialError = isError && data === undefined;
  const hasRefreshError = isError && data !== undefined;

  const openEmployee = useCallback(
    (user: AdminUser) =>
      router.push({
        pathname: '/history/employee/[id]',
        params: { id: user.id, name: user.fullName },
      }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Обходы по сотрудникам"
          subtitle="Выберите обходчика"
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по ФИО"
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
          keyExtractor={(user) => user.id}
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
              icon="people-outline"
              title="Сотрудники не найдены"
              description="Измените поисковый запрос."
            />
          }
          renderItem={({ item }) => <UserCard user={item} onPress={openEmployee} />}
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
