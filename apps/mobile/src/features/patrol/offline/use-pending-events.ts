import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import {
  getDatabase,
  PATROL_EVENTS_TABLE,
  PATROL_MISSED_POINT_ATTEMPTS_TABLE,
} from '@/db';
import { useAuthStore } from '@/store/auth-store';

export function usePendingEventCount(patrolId?: string): number {
  const userId = useAuthStore((state) => state.user?.id);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      if (!userId) {
        setCount(0);
        return;
      }
      const database = await getDatabase();
      const patrolFilter = patrolId === undefined ? '' : ' AND patrol_id = ?';
      const params = patrolId === undefined ? [userId] : [userId, patrolId];
      const row = await database.getFirstAsync<{ count: number }>(
        `SELECT
           (SELECT COUNT(*) FROM ${PATROL_EVENTS_TABLE}
            WHERE user_id = ? AND queue_status = 'pending'${patrolFilter}) +
           (SELECT COUNT(*) FROM ${PATROL_MISSED_POINT_ATTEMPTS_TABLE}
            WHERE user_id = ? AND queue_status = 'pending'${patrolFilter}) AS count`,
        [...params, ...params],
      );
      if (mounted) {
        setCount(row?.count ?? 0);
      }
    }

    void load();

    const subscription = addDatabaseChangeListener((change) => {
      if (
        change.tableName === PATROL_EVENTS_TABLE ||
        change.tableName === PATROL_MISSED_POINT_ATTEMPTS_TABLE
      ) {
        void load();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [patrolId, userId]);

  return count;
}
