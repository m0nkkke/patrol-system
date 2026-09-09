import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createControlGuard,
  getControlStaff,
  getControlStaffMember,
  type ControlStaffFilters,
  type ControlStaffMember,
} from '@/api/control-staff.api';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

export type { ControlStaffMember } from '@/api/control-staff.api';

export function useControlStaff(filters: ControlStaffFilters = {}) {
  const search = filters.search?.trim() || undefined;
  return useInfinitePaginated<ControlStaffMember>(
    [
      'control-staff-infinite',
      filters.shopId ?? 'all',
      filters.role ?? 'all',
      filters.isActive === undefined ? 'all' : String(filters.isActive),
      search ?? '',
      filters.sort ?? 'fullName:asc',
    ],
    (page) =>
      getControlStaff({
        ...filters,
        limit: PAGE_SIZE,
        page,
        search,
      }),
  );
}

export function useControlStaffMember(memberId: string) {
  return useQuery({
    queryKey: ['control-staff', memberId],
    queryFn: () => getControlStaffMember(memberId),
    enabled: memberId.length > 0,
  });
}

export function useCreateControlGuard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createControlGuard,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['control-staff-infinite'] });
    },
  });
}
