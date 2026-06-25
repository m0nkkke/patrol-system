import type { UserRole } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useUsers } from '@/features/users/queries';
import { UserCard } from '@/features/users/UserCard';
import { colors, spacing } from '@/theme';
import { AppText, Button, type FilterOption, FilterChips, Header, Screen, TextField } from '@/ui';

type RoleFilter = UserRole | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

const ROLE_FILTERS: FilterOption<RoleFilter>[] = [
  { value: 'all', label: 'Все роли' },
  { value: 'employee', label: 'Обходчики' },
  { value: 'manager', label: 'Менеджеры' },
  { value: 'admin', label: 'Админы' },
];

const STATUS_FILTERS: FilterOption<StatusFilter>[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];

export default function UsersListScreen(): React.ReactElement {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data, isPending, isError, error, refetch } = useUsers();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.items ?? []).filter((user) => {
      const matchesQuery = !query || user.fullName.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [data, search, roleFilter, statusFilter]);

  function openUser(userId: string): void {
    router.push({ pathname: '/users/[id]', params: { id: userId } });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Пользователи"
          onBack={() => router.back()}
        />
        <TextField value={search} onChangeText={setSearch} placeholder="Поиск по ФИО" icon="search" />
        <View style={styles.filters}>
          <FilterChips options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} />
        </View>
        <View style={styles.filtersSecond}>
          <FilterChips options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        </View>
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
          data={filtered}
          keyExtractor={(user) => user.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<AppText muted>Пользователи не найдены.</AppText>}
          renderItem={({ item }) => <UserCard user={item} onPress={() => openUser(item.id)} />}
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
  filters: {
    marginTop: spacing.md,
  },
  filtersSecond: {
    marginTop: spacing.xs,
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
