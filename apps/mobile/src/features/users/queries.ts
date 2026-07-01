import type { AssignUserShopsDto, CreateUserDto, UpdateUserDto, UserRole } from '@patrol/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignUserShops,
  createUser,
  getUser,
  getUsers,
  rotateUserAccessKey,
  updateUser,
} from '@/api/users.api';
import type { AdminUser } from '@/api/types';
import { PAGE_SIZE, useInfinitePaginated } from '@/api/use-infinite-paginated';

function invalidateUserLists(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ['users'] });
  void queryClient.invalidateQueries({ queryKey: ['users-infinite'] });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserDto) => createUser(payload),
    onSuccess: () => invalidateUserLists(queryClient),
  });
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserDto) => updateUser(userId, payload),
    onSuccess: (user) => {
      queryClient.setQueryData(['user', userId], user);
      invalidateUserLists(queryClient);
    },
  });
}

export function useRotateUserAccessKey(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rotateUserAccessKey(userId),
    onSuccess: (user) => {
      queryClient.setQueryData(['user', userId], user);
      invalidateUserLists(queryClient);
    },
  });
}

export function useAssignUserShops(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignUserShopsDto) => assignUserShops(userId, payload),
    onSuccess: (user) => {
      queryClient.setQueryData(['user', userId], user);
      invalidateUserLists(queryClient);
    },
  });
}

export function useInfiniteUsers(params: {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sort?: string;
}) {
  const search = params.search?.trim() || undefined;
  return useInfinitePaginated<AdminUser>(
    [
      'users-infinite',
      search ?? '',
      params.role ?? 'all',
      params.isActive ?? 'all',
      params.sort ?? 'fullName:asc',
    ],
    (page) =>
      getUsers({
        page,
        limit: PAGE_SIZE,
        search,
        role: params.role,
        isActive: params.isActive,
        sort: params.sort,
      }),
  );
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });
}
