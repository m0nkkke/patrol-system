import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getDatabase, PATROL_EVENTS_TABLE } from '@/db';

export type LocalEventView = {
  localId: string;
  patrolPointId: string;
  syncStatus: string;
};

type LocalEventRow = {
  local_id: string;
  patrol_point_id: string;
  queue_status: string;
};

export function useLocalPatrolEvents(patrolId: string): LocalEventView[] {
  const [events, setEvents] = useState<LocalEventView[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      const database = await getDatabase();
      const rows = await database.getAllAsync<LocalEventRow>(
        `SELECT local_id, patrol_point_id, queue_status FROM ${PATROL_EVENTS_TABLE} WHERE patrol_id = ?`,
        [patrolId],
      );
      if (mounted) {
        setEvents(
          rows.map((row) => ({
            localId: row.local_id,
            patrolPointId: row.patrol_point_id,
            syncStatus: row.queue_status,
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
  }, [patrolId]);

  return events;
}
