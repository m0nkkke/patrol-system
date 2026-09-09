import type {
  PatrolScanAction,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
} from '@patrol/shared';

import { reportMissedPointAttempt, syncPatrolEvents } from '@/api/patrols.api';
import { queryClient } from '@/api/query-client';
import {
  getDatabase,
  PATROL_EVENTS_TABLE,
  PATROL_MISSED_POINT_ATTEMPTS_TABLE,
} from '@/db';
import { useAuthStore } from '@/store/auth-store';

type PendingRow = {
  local_id: string;
  patrol_id: string;
  patrol_point_id: string;
  nfc_uid: string;
  scanned_at: string;
  device_id: string;
  lat: number | null;
  lng: number | null;
  gps_accuracy: number | null;
  scan_action: PatrolScanAction;
};

type PendingMissedPointAttemptRow = {
  attempted_patrol_point_id: string;
  device_id: string;
  expected_patrol_point_id: string;
  local_id: string;
  nfc_uid: string;
  patrol_id: string;
  scanned_at: string;
};

const BATCH_SIZE = 200;
const syncPromises = new Map<string, Promise<boolean>>();

export function syncPendingEvents(userId: string): Promise<boolean> {
  const activeSync = syncPromises.get(userId);
  if (activeSync) {
    return activeSync;
  }

  const syncPromise = performSync(userId).finally(() => {
    syncPromises.delete(userId);
  });
  syncPromises.set(userId, syncPromise);
  return syncPromise;
}

async function performSync(userId: string): Promise<boolean> {
  try {
    const database = await getDatabase();
    const pendingMissedAttempts = await database.getAllAsync<PendingMissedPointAttemptRow>(
      `SELECT * FROM ${PATROL_MISSED_POINT_ATTEMPTS_TABLE}
       WHERE user_id = ? AND queue_status = 'pending'
       ORDER BY scanned_at ASC, rowid ASC`,
      [userId],
    );
    const pending = await database.getAllAsync<PendingRow>(
      `SELECT * FROM ${PATROL_EVENTS_TABLE}
       WHERE user_id = ? AND queue_status = 'pending'
       ORDER BY scanned_at ASC, rowid ASC`,
      [userId],
    );
    if (pendingMissedAttempts.length === 0 && pending.length === 0) {
      return true;
    }

    let didSync = false;
    let allSucceeded = true;

    for (const attempt of pendingMissedAttempts) {
      if (!isCurrentUser(userId)) {
        return false;
      }
      try {
        await reportMissedPointAttempt(attempt.patrol_id, {
          attemptedPatrolPointId: attempt.attempted_patrol_point_id,
          clientLocalId: attempt.local_id,
          deviceId: attempt.device_id,
          expectedPatrolPointId: attempt.expected_patrol_point_id,
          nfcUid: attempt.nfc_uid,
          scannedAt: attempt.scanned_at,
        });
        await database.runAsync(
          `UPDATE ${PATROL_MISSED_POINT_ATTEMPTS_TABLE}
           SET queue_status = 'synced'
           WHERE local_id = ? AND user_id = ?`,
          [attempt.local_id, userId],
        );
        didSync = true;
      } catch {
        allSucceeded = false;
        break;
      }
    }

    let patrolEventsSucceeded = true;
    for (const [patrolId, rows] of groupByPatrol(pending)) {
      for (const batch of chunk(rows, BATCH_SIZE)) {
        if (!isCurrentUser(userId)) {
          return false;
        }
        try {
          const result = await syncPatrolEvents(patrolId, buildPayload(batch));
          await applyResults(userId, result.items);
          didSync = true;
        } catch {
          allSucceeded = false;
          patrolEventsSucceeded = false;
          break;
        }
      }
      if (!patrolEventsSucceeded) {
        break;
      }
    }

    if (didSync) {
      await queryClient.invalidateQueries({ queryKey: ['active-patrol'] });
      await queryClient.invalidateQueries({ queryKey: ['nfc-wait-state'] });
      await queryClient.invalidateQueries({ queryKey: ['schedule-plan'] });
      await queryClient.invalidateQueries({ queryKey: ['control-incidents-infinite'] });
    }
    return allSucceeded;
  } catch {
    // Данные остаются pending и будут отправлены при следующем триггере синка.
    return false;
  }
}

function isCurrentUser(userId: string): boolean {
  const { accessToken, user } = useAuthStore.getState();
  return accessToken !== null && user?.id === userId;
}

function groupByPatrol(rows: PendingRow[]): Map<string, PendingRow[]> {
  const groups = new Map<string, PendingRow[]>();
  for (const row of rows) {
    const group = groups.get(row.patrol_id) ?? [];
    group.push(row);
    groups.set(row.patrol_id, group);
  }
  return groups;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildPayload(rows: PendingRow[]): SyncPatrolEventsDto {
  return {
    events: rows.map((row) => ({
      localId: row.local_id,
      patrolPointId: row.patrol_point_id,
      nfcUid: row.nfc_uid,
      scannedAt: row.scanned_at,
      deviceId: row.device_id,
      lat: row.lat ?? undefined,
      lng: row.lng ?? undefined,
      gpsAccuracy: row.gps_accuracy ?? undefined,
      scanAction: row.scan_action,
    })),
  };
}

async function applyResults(
  userId: string,
  items: SyncPatrolEventsResultDto['items'],
): Promise<void> {
  const database = await getDatabase();
  for (const item of items) {
    await database.runAsync(
      `UPDATE ${PATROL_EVENTS_TABLE}
       SET queue_status = 'synced', server_id = ?, sync_result = ?
       WHERE local_id = ? AND user_id = ?`,
      [item.serverId, item.status, item.localId, userId],
    );
  }
}
