import { useQuery } from '@tanstack/react-query';

import {
  getControlReport,
  getControlReports,
  type ControlReport,
  type ControlReportFilters,
} from '@/api/control-reports.api';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

export function useInfiniteControlReports(filters: ControlReportFilters) {
  const search = filters.search?.trim() || undefined;
  return useInfinitePaginated<ControlReport>(
    [
      'control-reports-infinite',
      filters.shopId ?? 'all',
      filters.employeeId ?? 'all',
      filters.patrolId ?? 'all',
      filters.reportType ?? 'all',
      filters.status ?? 'all',
      filters.period ?? 'all',
      filters.from ?? '',
      filters.to ?? '',
      search ?? '',
      filters.sort ?? 'createdAt:desc',
    ],
    (page) =>
      getControlReports({
        ...filters,
        search,
        page,
        limit: PAGE_SIZE,
      }),
  );
}

export function useControlReport(reportId: string) {
  return useQuery({
    queryKey: ['control-report', reportId],
    queryFn: () => getControlReport(reportId),
    enabled: reportId.length > 0,
  });
}
