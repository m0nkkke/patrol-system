import { addDatabaseChangeListener } from 'expo-sqlite';
import type { PatrolScanAction } from '@patrol/shared';
import { useEffect, useState } from 'react';

import { getDatabase, PATROL_EVENTS_TABLE } from '@/db';
import { useAuthStore } from '@/store/auth-store';

export type LocalEventView = {
  localId: string;
  patrolPointId: string;
  scannedAt: string;
  syncStatus: string;
  scanAction: PatrolScanAction;
};

type LocalEventRow = {
  local_id: string;
  patrol_point_id: string;
  scanned_at: string;
  queue_status: string;
  scan_action: PatrolScanAction;
};

export function useLocalPatrolEvents(patrolId: string): LocalEventView[] {
  const userId = useAuthStore((state) => state.user?.id);
  const [events, setEvents] = useState<LocalEventView[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      if (!userId) {
        setEvents([]);
        return;
      }
      const database = await getDatabase();
      const rows = await database.getAllAsync<LocalEventRow>(
        `SELECT local_id, patrol_point_id, scanned_at, queue_status, scan_action
         FROM ${PATROL_EVENTS_TABLE}
         WHERE user_id = ? AND patrol_id = ?
         ORDER BY scanned_at ASC, rowid ASC`,
        [userId, patrolId],
      );
      if (mounted) {
        setEvents(
          rows.map((row) => ({
            localId: row.local_id,
            patrolPointId: row.patrol_point_id,
            scannedAt: row.scanned_at,
            syncStatus: row.queue_status,
            scanAction: row.scan_action,
          })),
        );
      }
    }

    void load();

    const subscription = addDatabaseChangeListener((change) => {
      if (change.tableName === PATROL_EVENTS_TABLE) {
        void load();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [patrolId, userId]);

  return events;
}
