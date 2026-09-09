import type { AlertSeverity, PatrolIncidentType } from '@patrol/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { ControlIncident } from '@/api/control-incidents.api';
import { describeError } from '@/api/error-messages';
import { ControlIncidentCard } from '@/features/control-incidents/ControlIncidentCard';
import { useInfiniteControlIncidents } from '@/features/control-incidents/queries';
import {
  incidentSeverityLabel,
  incidentTypeLabel,
} from '@/features/incidents/incident-type';
import {
  patrolPeriodFrom,
  PATROL_PERIOD_OPTIONS,
  type PatrolPeriodFilter,
} from '@/features/history/patrol-period-filter';
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

type TypeFilter = PatrolIncidentType | 'all';
type SeverityFilter = AlertSeverity | 'all';

const INCIDENT_TYPES: PatrolIncidentType[] = [
  'missed_point',
  'patrol_overdue',
  'schedule_deviation',
  'route_too_fast',
  'route_suspiciously_fast',
  'route_too_slow',
  'point_dwell_too_short',
  'short_interval',
  'long_interval',
];
const TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  ...INCIDENT_TYPES.map((value) => ({ value, label: incidentTypeLabel(value) })),
];
const SEVERITY_OPTIONS = [
  { value: 'all', label: 'Любая критичность' },
  { value: 'critical', label: incidentSeverityLabel('critical') },
  { value: 'warning', label: incidentSeverityLabel('warning') },
  { value: 'info', label: incidentSeverityLabel('info') },
];
const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'createdAt:desc', label: 'Сначала новые' },
  { value: 'createdAt:asc', label: 'Сначала старые' },
];

export default function IncidentsScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId, shopName } = useLocalSearchParams<{ shopId?: string; shopName?: string }>();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PatrolPeriodFilter>('30d');
  const [type, setType] = useState<TypeFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [sort, setSort] = useState('createdAt:desc');
  const debouncedSearch = useDebouncedValue(search);
  const from = useMemo(() => patrolPeriodFrom(period), [period]);
  const incidents = useInfiniteControlIncidents({
    from,
    shopId,
    type: type === 'all' ? undefined : type,
    severity: severity === 'all' ? undefined : severity,
    search: debouncedSearch,
    sort,
  });
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Период',
      options: PATROL_PERIOD_OPTIONS,
      value: period,
      onChange: (value) => setPeriod(value as PatrolPeriodFilter),
    },
    {
      title: 'Тип нарушения',
      options: TYPE_OPTIONS,
      value: type,
      onChange: (value) => setType(value as TypeFilter),
    },
    {
      title: 'Критичность',
      options: SEVERITY_OPTIONS,
      value: severity,
      onChange: (value) => setSeverity(value as SeverityFilter),
    },
  ];
  const openIncident = useCallback(
    (incident: ControlIncident) =>
      router.push({ pathname: '/incident/[id]', params: { id: incident.id } }),
    [router],
  );
  const total = incidents.data?.pages[0]?.total ?? 0;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const activeFilterCount =
    Number(period !== 'all') + Number(type !== 'all') + Number(severity !== 'all');
  const hasInitialError = incidents.isError && incidents.data === undefined;
  const hasRefreshError = incidents.isError && incidents.data !== undefined;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="Нарушения"
          subtitle={shopName ? `Магазин: ${shopName}` : 'Нарушения по всем магазинам'}
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Магазин, сотрудник или описание"
        />
        <FilterSortBar>
          <FilterSheet
            groups={filterGroups}
            label="Фильтр"
            activeCount={activeFilterCount}
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
        <View style={styles.summaryBar}>
          <AppText variant="caption">Найдено: {total}</AppText>
        </View>
      </View>

      {incidents.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(incidents.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void incidents.refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={incidents.items}
          keyExtractor={(incident) => incident.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={incidents.isRefetching}
              onRefresh={() => void incidents.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (incidents.hasNextPage && !incidents.isFetchingNextPage) {
              void incidents.fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={incidents.isFetchingNextPage} />}
          ListEmptyComponent={
            <EmptyState
              icon="warning-outline"
              title="Нарушения не найдены"
              description="Измените поиск, период или выбранные фильтры."
            />
          }
          renderItem={({ item }) => <ControlIncidentCard incident={item} onPress={openIncident} />}
        />
      )}

      <View style={styles.footer}>
        {!incidents.isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={incidents.dataUpdatedAt}
            isRefreshing={incidents.isRefetching}
            onRefresh={() => void incidents.refetch()}
          />
        ) : null}
      </View>
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
  summaryBar: {
    marginTop: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
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
