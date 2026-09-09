import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archivePatrolPoint,
  createPatrolPoint,
  createPatrolPointWithNfc,
  getArchivedShopRoutePoints,
  getPatrolPoint,
  getShopRoutePoints,
  restorePatrolPoint,
  type PatrolPointPhoto,
  type UpdatePatrolPointInput,
  updatePatrolPoint,
  uploadPatrolPointPhoto,
} from '@/api/patrol-points.api';
import type {
  CreatePatrolPointDto,
  CreatePatrolPointWithNfcDto,
  ReplaceNfcTagDto,
} from '@patrol/shared';
import { replaceNfcTag } from '@/api/patrol-points.api';

const pointListQueryKeys = (shopId: string) => [
  ['patrol-points', shopId],
  ['shop-patrol-points', shopId],
  ['route-setup', shopId],
  ['shop-patrol-routes', shopId],
  ['archived-patrol-points', shopId],
] as const;

function invalidatePointLists(queryClient: ReturnType<typeof useQueryClient>, shopId: string): void {
  for (const queryKey of pointListQueryKeys(shopId)) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

export function usePatrolPoint(pointId: string) {
  return useQuery({
    queryKey: ['patrol-point', pointId],
    queryFn: () => getPatrolPoint(pointId),
  });
}

export function useActivePatrolPoints(shopId: string) {
  return useQuery({
    queryKey: ['patrol-points', shopId],
    queryFn: () => getShopRoutePoints(shopId),
    enabled: shopId.length > 0,
  });
}

export function useCreatePatrolPoint(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePatrolPointDto) => createPatrolPoint(payload),
    onSuccess: (point) => {
      queryClient.setQueryData(['patrol-point', point.id], point);
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useCreatePatrolPointWithNfc(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePatrolPointWithNfcDto) => createPatrolPointWithNfc(payload),
    onSuccess: (point) => {
      queryClient.setQueryData(['patrol-point', point.id], point);
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useBindPatrolPointNfc(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pointId, payload }: { pointId: string; payload: ReplaceNfcTagDto }) =>
      replaceNfcTag(pointId, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['patrol-point', variables.pointId] });
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useArchivedPatrolPoints(shopId: string) {
  return useQuery({
    queryKey: ['archived-patrol-points', shopId],
    queryFn: () => getArchivedShopRoutePoints(shopId),
    enabled: shopId.length > 0,
  });
}

export function useUpdatePatrolPoint(shopId: string, pointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePatrolPointInput) => updatePatrolPoint(pointId, payload),
    onSuccess: (point) => {
      queryClient.setQueryData(['patrol-point', pointId], point);
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useArchivePatrolPoint(shopId: string, pointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archivePatrolPoint(pointId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['patrol-point', pointId] });
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useRestorePatrolPoint(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pointId: string) => restorePatrolPoint(pointId),
    onSuccess: (point) => {
      queryClient.setQueryData(['patrol-point', point.id], point);
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useUploadPatrolPointPhoto(shopId: string, pointId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: PatrolPointPhoto) => uploadPatrolPointPhoto(pointId, photo),
    onSuccess: (point) => {
      queryClient.setQueryData(['patrol-point', pointId], point);
      invalidatePointLists(queryClient, shopId);
    },
  });
}

export function useUploadCreatedPatrolPointPhoto(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pointId, photo }: { pointId: string; photo: PatrolPointPhoto }) =>
      uploadPatrolPointPhoto(pointId, photo),
    onSuccess: (point) => {
      queryClient.setQueryData(['patrol-point', point.id], point);
      invalidatePointLists(queryClient, shopId);
    },
  });
}
