import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'patrol.db';

export const PATROL_EVENTS_TABLE = 'patrol_events';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initDatabase();
  }
  return databasePromise;
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME, {
    enableChangeListener: true,
  });

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ${PATROL_EVENTS_TABLE} (
      local_id TEXT PRIMARY KEY NOT NULL,
      patrol_id TEXT NOT NULL,
      patrol_point_id TEXT NOT NULL,
      nfc_uid TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      device_id TEXT NOT NULL,
      lat REAL,
      lng REAL,
      gps_accuracy REAL,
      queue_status TEXT NOT NULL,
      server_id TEXT,
      sync_result TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_patrol_events_patrol ON ${PATROL_EVENTS_TABLE} (patrol_id);
    CREATE INDEX IF NOT EXISTS idx_patrol_events_queue ON ${PATROL_EVENTS_TABLE} (queue_status);
  `);

  return database;
}
