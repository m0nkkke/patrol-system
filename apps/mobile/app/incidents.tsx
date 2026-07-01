import type { PatrolIncidentType } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { PatrolIncident } from '@/api/types';
import { IncidentCard } from '@/features/incidents/IncidentCard';
import { useInfiniteIncidents } from '@/features/incidents/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useAuthStore } from '@/store/auth-store';
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

type TypeFilter = PatrolIncidentType | 'all';

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'missed_point', label: 'Пропуск точки' },
  { value: 'short_interval', label: 'Слишком быстро' },
  { value: 'long_interval', label: 'Слишком долго' },
];

const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'createdAt:desc', label: 'Сначала новые' },
  { value: 'createdAt:asc', label: 'Сначала старые' },
  { value: 'type:asc', label: 'По типу' },
];

export default function IncidentsScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState('createdAt:desc');
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
  } = useInfiniteIncidents({
    shopId: user?.shopId,
    type: type === 'all' ? undefined : type,
    search: debouncedSearch,
    sort,
  });

  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Тип нарушения',
      options: TYPE_OPTIONS,
      value: type,
      onChange: (value) => setType(value as TypeFilter),
    },
  ];

  const openIncident = useCallback(
    (incident: PatrolIncident) =>
      router.push({ pathname: '/history/patrol/[id]', params: { id: incident.patrolId } }),
    [router],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Нарушения"
          subtitle="Подозрительные обходы — тайминги и пропуски точек"
          onBack={() => router.back()}
        />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по сотруднику, магазину, тексту"
          icon="search"
          tone="control"
        />
        <FilterSortBar>
          <FilterSheet groups={filterGroups} activeCount={type === 'all' ? 0 : 1} />
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
          data={items}
          keyExtractor={(incident) => incident.id}
          contentContainerStyle={styles.list}
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
          ListEmptyComponent={<AppText muted>Нарушений не найдено.</AppText>}
          renderItem={({ item }) => <IncidentCard incident={item} onPress={openIncident} />}
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
