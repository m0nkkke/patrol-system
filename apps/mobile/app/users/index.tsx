import type { UserRole } from '@patrol/shared';
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

type RoleFilter = UserRole | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Все роли' },
  { value: 'security_guard', label: 'Сотрудники контроля' },
  { value: 'route_setter', label: 'Универсальные настройщики' },
  { value: 'local_route_setter', label: 'Локальные настройщики' },
  { value: 'inspector', label: 'Проверяющие' },
  { value: 'admin', label: 'Администраторы' },
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
  } = useInfiniteUsers({
    search: debouncedSearch,
    role: roleFilter === 'all' ? undefined : roleFilter,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sort,
  });

  const total = data?.pages[0]?.total ?? items.length;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const hasInitialError = isError && data === undefined;
  const hasRefreshError = isError && data !== undefined;

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
        <Header
          title="Пользователи"
          subtitle={`Всего пользователей: ${total}`}
          onBack={() => router.back()}
          titleAction={{
            accessibilityLabel: 'Добавить пользователя',
            icon: 'person-add-outline',
            onPress: () => router.navigate('/users/new'),
          }}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по ФИО или логину"
        />
        <FilterSortBar>
          <FilterSheet
            groups={filterGroups}
            label="Фильтр"
            activeCount={activeCount}
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
              title="Пользователи не найдены"
              description="Измените поисковый запрос или выбранные фильтры."
            />
          }
          renderItem={({ item }) => <UserCard user={item} onPress={openUser} />}
        />
      )}

      <View style={styles.footer}>
        {!isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={dataUpdatedAt}
            isRefreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        ) : null}
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
    paddingBottom: screenInsets.footerBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.footerTop,
  },
});
