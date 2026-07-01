import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { AdminUser } from '@/api/types';
import { useInfiniteUsers } from '@/features/users/queries';
import { UserCard } from '@/features/users/UserCard';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, spacing } from '@/theme';
import { AppText, Button, Header, ListFooter, Screen, TextField } from '@/ui';

export default function HistoryEmployeesScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

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
  } = useInfiniteUsers({ search: debouncedSearch, role: 'employee', sort: 'fullName:asc' });

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
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по ФИО"
          icon="search"
          tone="control"
        />
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
          ListEmptyComponent={<AppText muted>Обходчики не найдены.</AppText>}
          renderItem={({ item }) => <UserCard user={item} onPress={openEmployee} />}
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
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
