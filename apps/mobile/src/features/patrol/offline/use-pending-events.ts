import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getDatabase, PATROL_EVENTS_TABLE } from '@/db';

export function usePendingEventCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${PATROL_EVENTS_TABLE} WHERE queue_status = 'pending'`,
      );
      if (mounted) {
        setCount(row?.count ?? 0);
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
  }, []);

  return count;
}
