import type { UserRole } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { AdminUser } from '@/api/types';
import { useInfiniteUsers } from '@/features/users/queries';
import { UserCard } from '@/features/users/UserCard';
import { useDebouncedValue } from '@/lib/use-debounced-value';
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
  type SheetButtonOption,
  TextField,
} from '@/ui';

type RoleFilter = UserRole | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Все роли' },
  { value: 'employee', label: 'Обходчики' },
  { value: 'manager', label: 'Менеджеры' },
  { value: 'admin', label: 'Админы' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];

const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'fullName:asc', label: 'ФИО (А–Я)' },
  { value: 'fullName:desc', label: 'ФИО (Я–А)' },
  { value: 'role:asc', label: 'По роли' },
];

export default function UsersListScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState('fullName:asc');
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
  } = useInfiniteUsers({
    search: debouncedSearch,
    role: roleFilter === 'all' ? undefined : roleFilter,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sort,
  });

  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Роль',
      options: ROLE_OPTIONS,
      value: roleFilter,
      onChange: (value) => setRoleFilter(value as RoleFilter),
    },
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: statusFilter,
      onChange: (value) => setStatusFilter(value as StatusFilter),
    },
  ];

  const activeCount = (roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const openUser = useCallback(
    (user: AdminUser) => router.push({ pathname: '/users/[id]', params: { id: user.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header title="Пользователи" onBack={() => router.back()} />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по ФИО"
          icon="search"
          tone="control"
        />
        <FilterSortBar>
          <FilterSheet groups={filterGroups} activeCount={activeCount} />
          <SheetButton
            label="Сортировать"
            icon="swap-vertical-outline"
            title="Сортировка"
            options={SORT_OPTIONS}
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
          ListEmptyComponent={<AppText muted>Пользователи не найдены.</AppText>}
          renderItem={({ item }) => <UserCard user={item} onPress={openUser} />}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Добавить пользователя"
          icon="person-add-outline"
          onPress={() => router.push('/users/new')}
        />
      </View>
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
    paddingBottom: spacing.lg,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
