import type { PatrolPeriod, PatrolReportStatus, PatrolReportType } from '@patrol/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { ControlReport } from '@/api/control-reports.api';
import { describeError } from '@/api/error-messages';
import { ControlReportCard } from '@/features/control-reports/ControlReportCard';
import {
  REPORT_PERIOD_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
} from '@/features/control-reports/format';
import { useInfiniteControlReports } from '@/features/control-reports/queries';
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

type ReportTypeFilter = PatrolReportType | 'all';
type ReportStatusFilter = PatrolReportStatus | 'all';
type ReportPeriodFilter = PatrolPeriod | 'all';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  ...Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  ...Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];
const REPORT_PERIOD_OPTIONS = [
  { value: 'all', label: 'Все периоды дня' },
  ...Object.entries(REPORT_PERIOD_LABELS).map(([value, label]) => ({ value, label })),
];
const SORT_OPTIONS: SheetButtonOption<string>[] = [
  { value: 'createdAt:desc', label: 'Сначала новые' },
  { value: 'createdAt:asc', label: 'Сначала старые' },
  { value: 'submittedAt:desc', label: 'Сначала недавно отправленные' },
  { value: 'submittedAt:asc', label: 'Сначала давно отправленные' },
];

export default function ControlReportsScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId, shopName } = useLocalSearchParams<{ shopId?: string; shopName?: string }>();
  const [search, setSearch] = useState('');
  const [datePeriod, setDatePeriod] = useState<PatrolPeriodFilter>('30d');
  const [reportType, setReportType] = useState<ReportTypeFilter>('all');
  const [status, setStatus] = useState<ReportStatusFilter>('all');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriodFilter>('all');
  const [sort, setSort] = useState('createdAt:desc');
  const debouncedSearch = useDebouncedValue(search);
  const from = useMemo(() => patrolPeriodFrom(datePeriod), [datePeriod]);
  const reports = useInfiniteControlReports({
    from,
    period: reportPeriod === 'all' ? undefined : reportPeriod,
    shopId,
    search: debouncedSearch,
    reportType: reportType === 'all' ? undefined : reportType,
    status: status === 'all' ? undefined : status,
    sort,
  });
  const filterGroups: FilterSheetGroup[] = [
    {
      title: 'Период создания',
      options: PATROL_PERIOD_OPTIONS,
      value: datePeriod,
      onChange: (value) => setDatePeriod(value as PatrolPeriodFilter),
    },
    {
      title: 'Тип отчёта',
      options: TYPE_OPTIONS,
      value: reportType,
      onChange: (value) => setReportType(value as ReportTypeFilter),
    },
    {
      title: 'Статус',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => setStatus(value as ReportStatusFilter),
    },
    {
      title: 'Период дня',
      options: REPORT_PERIOD_OPTIONS,
      value: reportPeriod,
      onChange: (value) => setReportPeriod(value as ReportPeriodFilter),
    },
  ];
  const openReport = useCallback(
    (report: ControlReport) =>
      router.push({ pathname: '/control-reports/[id]', params: { id: report.id } }),
    [router],
  );
  const total = reports.data?.pages[0]?.total ?? 0;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';
  const activeFilterCount =
    Number(datePeriod !== 'all') +
    Number(reportType !== 'all') +
    Number(status !== 'all') +
    Number(reportPeriod !== 'all');
  const hasInitialError = reports.isError && reports.data === undefined;
  const hasRefreshError = reports.isError && reports.data !== undefined;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="Операционные отчёты"
          subtitle={shopName ? `Магазин: ${shopName}` : 'Отчёты по всем магазинам'}
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Магазин, сотрудник, комментарий"
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

      {reports.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(reports.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void reports.refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={reports.items}
          keyExtractor={(report) => report.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={reports.isRefetching}
              onRefresh={() => void reports.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (reports.hasNextPage && !reports.isFetchingNextPage) {
              void reports.fetchNextPage();
            }
          }}
          ListFooterComponent={<ListFooter loading={reports.isFetchingNextPage} />}
          ListEmptyComponent={
            <EmptyState
              icon="documents-outline"
              title="Отчёты не найдены"
              description="Измените поиск, период или выбранные фильтры."
            />
          }
          renderItem={({ item }) => <ControlReportCard report={item} onPress={openReport} />}
        />
      )}

      <View style={styles.footer}>
        {!reports.isPending && !hasInitialError ? (
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            updatedAt={reports.dataUpdatedAt}
            isRefreshing={reports.isRefetching}
            onRefresh={() => void reports.refetch()}
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
