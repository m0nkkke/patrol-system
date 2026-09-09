import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'patrol.db';

export const PATROL_EVENTS_TABLE = 'patrol_events';
export const PATROL_MISSED_POINT_ATTEMPTS_TABLE = 'patrol_missed_point_attempts';
export const SCHEDULE_PLAN_TABLE = 'schedule_plan';
export const RUNTIME_CACHE_TABLE = 'runtime_cache';

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
      user_id TEXT NOT NULL,
      patrol_id TEXT NOT NULL,
      patrol_point_id TEXT NOT NULL,
      nfc_uid TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      device_id TEXT NOT NULL,
      lat REAL,
      lng REAL,
      gps_accuracy REAL,
      scan_action TEXT NOT NULL,
      queue_status TEXT NOT NULL,
      server_id TEXT,
      sync_result TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_patrol_events_patrol ON ${PATROL_EVENTS_TABLE} (patrol_id);
    CREATE INDEX IF NOT EXISTS idx_patrol_events_queue ON ${PATROL_EVENTS_TABLE} (queue_status);
    CREATE TABLE IF NOT EXISTS ${PATROL_MISSED_POINT_ATTEMPTS_TABLE} (
      local_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      patrol_id TEXT NOT NULL,
      expected_patrol_point_id TEXT NOT NULL,
      attempted_patrol_point_id TEXT NOT NULL,
      nfc_uid TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      device_id TEXT NOT NULL,
      queue_status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_patrol_missed_attempts_patrol
      ON ${PATROL_MISSED_POINT_ATTEMPTS_TABLE} (patrol_id);
    CREATE INDEX IF NOT EXISTS idx_patrol_missed_attempts_queue
      ON ${PATROL_MISSED_POINT_ATTEMPTS_TABLE} (queue_status);
    CREATE TABLE IF NOT EXISTS ${SCHEDULE_PLAN_TABLE} (
      occurrence_key TEXT PRIMARY KEY NOT NULL,
      schedule_id TEXT NOT NULL,
      shop_id TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      schedule_name TEXT NOT NULL,
      planned_start_at TEXT NOT NULL,
      available_from TEXT NOT NULL,
      due_at TEXT NOT NULL,
      notification_at TEXT NOT NULL,
      notification_id TEXT,
      dismissed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_schedule_plan_notification
      ON ${SCHEDULE_PLAN_TABLE} (notification_at);
    CREATE TABLE IF NOT EXISTS ${RUNTIME_CACHE_TABLE} (
      cache_key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await ensureQueueOwnerColumn(database, PATROL_EVENTS_TABLE);
  await ensureQueueOwnerColumn(database, PATROL_MISSED_POINT_ATTEMPTS_TABLE);
  await ensureSchedulePlanColumns(database);
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_patrol_events_user_queue
      ON ${PATROL_EVENTS_TABLE} (user_id, queue_status);
    CREATE INDEX IF NOT EXISTS idx_patrol_missed_attempts_user_queue
      ON ${PATROL_MISSED_POINT_ATTEMPTS_TABLE} (user_id, queue_status);
    DELETE FROM ${PATROL_EVENTS_TABLE}
      WHERE queue_status = 'synced' AND datetime(scanned_at) < datetime('now', '-30 days');
    DELETE FROM ${PATROL_MISSED_POINT_ATTEMPTS_TABLE}
      WHERE queue_status = 'synced' AND datetime(scanned_at) < datetime('now', '-30 days');
  `);

  return database;
}

async function ensureSchedulePlanColumns(database: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${SCHEDULE_PLAN_TABLE})`,
  );
  if (!columns.some((column) => column.name === 'dismissed_at')) {
    await database.execAsync(`ALTER TABLE ${SCHEDULE_PLAN_TABLE} ADD COLUMN dismissed_at TEXT;`);
  }
}

async function ensureQueueOwnerColumn(
  database: SQLite.SQLiteDatabase,
  tableName: typeof PATROL_EVENTS_TABLE | typeof PATROL_MISSED_POINT_ATTEMPTS_TABLE,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === 'user_id')) {
    await database.execAsync(`ALTER TABLE ${tableName} ADD COLUMN user_id TEXT;`);
  }

  // Legacy rows cannot be attributed to a user safely.
  await database.runAsync(`DELETE FROM ${tableName} WHERE user_id IS NULL OR user_id = ''`);
}
