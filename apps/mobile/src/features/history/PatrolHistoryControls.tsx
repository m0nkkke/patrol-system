import {
  FilterSheet,
  type FilterSheetGroup,
  FilterSortBar,
  SheetButton,
} from '@/ui';

import {
  PATROL_SORT_OPTIONS,
  PATROL_STATUS_OPTIONS,
  type PatrolStatusFilter,
} from './patrol-filters';
import {
  PATROL_PERIOD_OPTIONS,
  type PatrolPeriodFilter,
} from './patrol-period-filter';

type PatrolHistoryControlsProps = {
  compact?: boolean;
  onPeriodChange?: (value: PatrolPeriodFilter) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: PatrolStatusFilter) => void;
  period?: PatrolPeriodFilter;
  sort: string;
  status: PatrolStatusFilter;
};

export function PatrolHistoryControls({
  compact = false,
  onPeriodChange,
  onSortChange,
  onStatusChange,
  period,
  sort,
  status,
}: PatrolHistoryControlsProps): React.ReactElement {
  const filterGroups: FilterSheetGroup[] = [];

  if (period !== undefined && onPeriodChange) {
    filterGroups.push({
      title: 'Период',
      options: PATROL_PERIOD_OPTIONS,
      value: period,
      onChange: (value) => onPeriodChange(value as PatrolPeriodFilter),
    });
  }

  filterGroups.push({
    title: 'Статус',
    options: PATROL_STATUS_OPTIONS,
    value: status,
    onChange: (value) => onStatusChange(value as PatrolStatusFilter),
  });

  const activeCount =
    (period !== undefined && period !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0);
  const sortLabel = PATROL_SORT_OPTIONS.find((option) => option.value === sort)?.label;

  return (
    <FilterSortBar compact={compact}>
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
        options={PATROL_SORT_OPTIONS}
        value={sort}
        onChange={onSortChange}
      />
    </FilterSortBar>
  );
}
