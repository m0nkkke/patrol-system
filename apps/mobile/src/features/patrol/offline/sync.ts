import type { SyncPatrolEventsDto, SyncPatrolEventsResultDto } from '@patrol/shared';

import { syncPatrolEvents } from '@/api/patrols.api';
import { queryClient } from '@/api/query-client';
import { getDatabase, PATROL_EVENTS_TABLE } from '@/db';

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
};

const BATCH_SIZE = 200;
let isSyncing = false;

export async function syncPendingEvents(): Promise<void> {
  if (isSyncing) {
    return;
  }
  isSyncing = true;

  try {
    const database = await getDatabase();
    const pending = await database.getAllAsync<PendingRow>(
      `SELECT * FROM ${PATROL_EVENTS_TABLE} WHERE queue_status = 'pending'`,
    );
    if (pending.length === 0) {
      return;
    }

    let didSync = false;

    for (const [patrolId, rows] of groupByPatrol(pending)) {
      for (const batch of chunk(rows, BATCH_SIZE)) {
        const result = await syncPatrolEvents(patrolId, buildPayload(batch));
        await applyResults(result.items);
        didSync = true;
      }
    }

    if (didSync) {
      await queryClient.invalidateQueries({ queryKey: ['active-patrol'] });
    }
  } catch {
    // События остаются pending и будут отправлены при следующем триггере синка.
  } finally {
    isSyncing = false;
  }
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
    })),
  };
}

async function applyResults(items: SyncPatrolEventsResultDto['items']): Promise<void> {
  const database = await getDatabase();
  for (const item of items) {
    await database.runAsync(
      `UPDATE ${PATROL_EVENTS_TABLE} SET queue_status = 'synced', server_id = ?, sync_result = ? WHERE local_id = ?`,
      [item.serverId, item.status, item.localId],
    );
  }
}
