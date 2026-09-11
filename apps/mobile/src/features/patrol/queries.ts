import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

import { ApiError } from '@/api/errors';
import type { Patrol } from '@/api/types';
import {
  cancelPatrol,
  completePatrol,
  getActivePatrol,
  getAvailableSchedules,
  getPatrolNfcWaitState,
  getRoute,
  startPatrol,
} from '@/api/patrols.api';
import {
  clearActivePatrolSnapshot,
  loadActivePatrolSnapshot,
  loadNfcWaitStateSnapshot,
  loadPatrolRouteSnapshot,
  saveActivePatrolSnapshot,
  saveNfcWaitStateSnapshot,
  savePatrolRouteSnapshot,
} from '@/features/patrol/offline/runtime-cache';
import { dismissCurrentScheduleReminders } from '@/features/notifications/schedule-plan';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/store/auth-store';

const ROUTE_KEY = ['patrol-route'] as const;
const ACTIVE_PATROL_KEY = ['active-patrol'] as const;
const AVAILABLE_SCHEDULES_KEY = ['available-schedules'] as const;
const NFC_WAIT_STATE_KEY = ['nfc-wait-state'] as const;

export function usePatrolRoute(patrol: Patrol | null | undefined) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: [...ROUTE_KEY, patrol?.id],
    queryFn: async () => {
      const currentPatrol = patrol as Patrol;
      const currentUserId = userId as string;

      if (currentPatrol.routeSnapshot !== undefined && currentPatrol.routeSnapshot !== null) {
        await persistSnapshot(
          savePatrolRouteSnapshot(currentUserId, currentPatrol.id, currentPatrol.routeSnapshot),
        );
        return currentPatrol.routeSnapshot;
      }

      const offlineSnapshot = await loadWhenDisconnected(() =>
        loadPatrolRouteSnapshot(currentUserId, currentPatrol.id),
      );
      if (offlineSnapshot.value) {
        return offlineSnapshot.value;
      }
      if (offlineSnapshot.disconnected) {
        throw new ApiError('NETWORK_ERROR', 'Route snapshot is unavailable', 0);
      }
      try {
        const route = await getRoute(currentPatrol.shopId);
        await persistSnapshot(savePatrolRouteSnapshot(currentUserId, currentPatrol.id, route));
        return route;
      } catch (error) {
        const snapshot = await loadOnNetworkError(
          error,
          () => loadPatrolRouteSnapshot(currentUserId, currentPatrol.id),
        );
        if (snapshot) {
          return snapshot;
        }
        throw error;
      }
    },
    enabled: patrol !== null && patrol !== undefined && userId !== undefined,
    retry: retryPatrolQuery,
  });
}

export function useActivePatrol() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ACTIVE_PATROL_KEY,
    queryFn: async () => {
      const currentUserId = userId as string;
      const offlineSnapshot = await loadWhenDisconnected(() =>
        loadActivePatrolSnapshot(currentUserId),
      );
      if (offlineSnapshot.value) {
        return offlineSnapshot.value;
      }
      if (offlineSnapshot.disconnected) {
        throw new ApiError('NETWORK_ERROR', 'Active patrol snapshot is unavailable', 0);
      }
      try {
        const patrol = await getActivePatrol();
        if (patrol) {
          await persistActivePatrolSnapshots(currentUserId, patrol);
        } else {
          await persistSnapshot(clearActivePatrolSnapshot(currentUserId));
        }
        return patrol;
      } catch (error) {
        const snapshot = await loadOnNetworkError(
          error,
          () => loadActivePatrolSnapshot(currentUserId),
        );
        if (snapshot) {
          return snapshot;
        }
        throw error;
      }
    },
    enabled: userId !== undefined,
    retry: retryPatrolQuery,
  });
}

export function useAvailableSchedules(shopId: string | null) {
  return useQuery({
    queryKey: [...AVAILABLE_SCHEDULES_KEY, shopId],
    queryFn: () => getAvailableSchedules(shopId as string),
    enabled: shopId !== null,
    refetchInterval: 30_000,
  });
}

export function usePatrolNfcWaitState(patrolId: string | null) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: [...NFC_WAIT_STATE_KEY, patrolId],
    queryFn: async () => {
      const currentPatrolId = patrolId as string;
      const currentUserId = userId as string;
      const offlineSnapshot = await loadWhenDisconnected(() =>
        loadNfcWaitStateSnapshot(currentUserId, currentPatrolId),
      );
      if (offlineSnapshot.value) {
        return offlineSnapshot.value;
      }
      if (offlineSnapshot.disconnected) {
        throw new ApiError('NETWORK_ERROR', 'NFC wait-state snapshot is unavailable', 0);
      }
      try {
        const waitState = await getPatrolNfcWaitState(currentPatrolId);
        await persistSnapshot(
          saveNfcWaitStateSnapshot(currentUserId, currentPatrolId, waitState),
        );
        return waitState;
      } catch (error) {
        const snapshot = await loadOnNetworkError(
          error,
          () => loadNfcWaitStateSnapshot(currentUserId, currentPatrolId),
        );
        if (snapshot) {
          return snapshot;
        }
        throw error;
      }
    },
    enabled: patrolId !== null && userId !== undefined,
    refetchInterval: 15_000,
    retry: retryPatrolQuery,
  });
}

export function useStartPatrol(shopId: string | null) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  return useMutation({
    mutationFn: ({
      lateStartReason,
      scheduleId,
    }: {
      lateStartReason?: string;
      scheduleId?: string;
    }) => {
      if (shopId === null) {
        throw new Error('Сначала выберите магазин.');
      }
      return startPatrol(shopId, scheduleId, lateStartReason);
    },
    onSuccess: (patrol, variables) => {
      queryClient.setQueryData(ACTIVE_PATROL_KEY, patrol);
      if (userId) {
        void persistActivePatrolSnapshots(userId, patrol);
      }
      if (variables.scheduleId) {
        void dismissCurrentScheduleReminders(variables.scheduleId).catch((error: unknown) => {
          logger.error(error, { source: 'schedule-reminder-dismissal' });
        });
      }
    },
  });
}

export function useCompletePatrol() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  return useMutation({
    mutationFn: ({ patrolId, report }: { patrolId: string; report?: string }) =>
      completePatrol(patrolId, report),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(ACTIVE_PATROL_KEY, null);
      if (userId) {
        void persistSnapshot(clearActivePatrolSnapshot(userId, variables.patrolId));
      }
      void queryClient.invalidateQueries({ queryKey: AVAILABLE_SCHEDULES_KEY });
    },
  });
}

export function useCancelPatrol() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  return useMutation({
    mutationFn: ({ patrolId, reason }: { patrolId: string; reason?: string }) =>
      cancelPatrol(patrolId, reason),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(ACTIVE_PATROL_KEY, null);
      if (userId) {
        void persistSnapshot(clearActivePatrolSnapshot(userId, variables.patrolId));
      }
      void queryClient.invalidateQueries({ queryKey: AVAILABLE_SCHEDULES_KEY });
    },
  });
}

async function loadOnNetworkError<T>(
  error: unknown,
  loadSnapshot: () => Promise<T | null>,
): Promise<T | null> {
  if (!(error instanceof ApiError) || error.code !== 'NETWORK_ERROR') {
    return null;
  }
  try {
    return await loadSnapshot();
  } catch (cacheError) {
    logger.error(cacheError, { source: 'patrol-runtime-cache-read' });
    return null;
  }
}

async function persistSnapshot(operation: Promise<void>): Promise<void> {
  await operation.catch((error: unknown) => {
    logger.error(error, { source: 'patrol-runtime-cache' });
  });
}

async function persistActivePatrolSnapshots(userId: string, patrol: Patrol): Promise<void> {
  const operations: Promise<void>[] = [saveActivePatrolSnapshot(userId, patrol)];
  if (patrol.routeSnapshot !== undefined && patrol.routeSnapshot !== null) {
    operations.push(savePatrolRouteSnapshot(userId, patrol.id, patrol.routeSnapshot));
  }
  await persistSnapshot(Promise.all(operations).then(() => undefined));
}

async function loadWhenDisconnected<T>(
  loadSnapshot: () => Promise<T | null>,
): Promise<{ disconnected: boolean; value: T | null }> {
  const connection = await NetInfo.fetch().catch(() => null);
  if (connection?.isConnected !== false) {
    return { disconnected: false, value: null };
  }
  const value = await loadSnapshot().catch((error: unknown) => {
    logger.error(error, { source: 'patrol-runtime-cache-read' });
    return null;
  });
  return { disconnected: true, value };
}

function retryPatrolQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || (error.statusCode >= 400 && error.statusCode < 500)) {
      return false;
    }
  }
  return failureCount < 1;
}
