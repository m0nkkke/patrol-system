import type { UserRole } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { ControlStaffSort } from '@/api/control-staff.api';
import { ControlStaffCard } from '@/features/control-staff/ControlStaffCard';
import {
  type ControlStaffMember,
  useControlStaff,
} from '@/features/control-staff/use-control-staff';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { roleLabel } from '@/features/users/role';
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
type StatusFilter = 'active' | 'all' | 'inactive';

const ROLE_FILTERS: RoleFilter[] = [
  'all',
  'security_guard',
  'local_route_setter',
  'route_setter',
  'admin',
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Активные', value: 'active' },
  { label: 'Неактивные', value: 'inactive' },
];

const SORT_OPTIONS: SheetButtonOption<ControlStaffSort>[] = [
  { label: 'ФИО (А-Я)', value: 'fullName:asc' },
  { label: 'ФИО (Я-А)', value: 'fullName:desc' },
  { label: 'По роли', value: 'role:asc' },
  { label: 'По статусу', value: 'isActive:desc' },
];

export default function ControlStaffScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<ControlStaffSort>('fullName:asc');
  const debouncedSearch = useDebouncedValue(search);
  const staff = useControlStaff({
    isActive: status === 'all' ? undefined : status === 'active',
    role: role === 'all' ? undefined : role,
    search: debouncedSearch,
    sort,
  });
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Роль',
      options: ROLE_FILTERS.map((value) => ({
        value,
        label: value === 'all' ? 'Все роли' : roleLabel(value),
      })),
      value: role,
      onChange: (value) => setRole(value as RoleFilter),
    },
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as StatusFilter),
    },
  ];
  const activeFilterCount = (role === 'all' ? 0 : 1) + (status === 'all' ? 0 : 1);
  const total = staff.data?.pages[0]?.total ?? staff.items.length;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label;
  const hasInitialError = staff.isError && staff.data === undefined;
  const hasRefreshError = staff.isError && staff.data !== undefined;
  const openMember = useCallback(
    (member: ControlStaffMember) =>
      router.push({ pathname: '/control-staff/[id]', params: { id: member.id } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Сотрудники и назначения"
          subtitle={`Всего сотрудников: ${total}`}
          onBack={() => router.back()}
          titleAction={{
            accessibilityLabel: 'Добавить сотрудника контроля',
            icon: 'person-add-outline',
            onPress: () => router.navigate('/control-staff/new'),
          }}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по ФИО"
        />
        <FilterSortBar>
          <FilterSheet groups={filterGroups} activeCount={activeFilterCount} />
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

      {staff.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(staff.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void staff.refetch()} />
        </View>
      ) : (
        <FlatList
          data={staff.items}
          keyExtractor={(member) => member.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={staff.isRefetching}
              onRefresh={() => void staff.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (staff.hasNextPage && !staff.isFetchingNextPage) {
              void staff.fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={staff.isFetchingNextPage} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Сотрудники не найдены"
              description="Измените поисковый запрос или выбранные фильтры."
            />
          }
          renderItem={({ item }) => <ControlStaffCard member={item} onPress={openMember} />}
        />
      )}

      {!staff.isPending && !hasInitialError ? (
        <View style={styles.footer}>
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={staff.dataUpdatedAt}
            isRefreshing={staff.isRefetching}
            onRefresh={() => void staff.refetch()}
          />
        </View>
      ) : null}
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
  list: {
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
