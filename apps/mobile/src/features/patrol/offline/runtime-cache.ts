import type { NfcWaitStateDto, PatrolSnapshotPoint } from '@patrol/shared';

import type { MobileMeResponse, Patrol } from '@/api/types';
import { getDatabase, RUNTIME_CACHE_TABLE } from '@/db';

const AUTH_SESSION_KEY = 'auth-session';
const OFFLINE_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CacheRow = {
  updated_at: number;
  value_json: string;
};

export async function saveAuthSessionSnapshot(session: MobileMeResponse): Promise<void> {
  await writeCache(AUTH_SESSION_KEY, session);
}

export async function loadAuthSessionSnapshot(): Promise<MobileMeResponse | null> {
  const cached = await readCache<unknown>(AUTH_SESSION_KEY);
  if (
    !cached ||
    Date.now() - cached.updatedAt > OFFLINE_SESSION_MAX_AGE_MS ||
    !isMobileSession(cached.value)
  ) {
    if (cached) {
      await deleteCache(AUTH_SESSION_KEY);
    }
    return null;
  }
  return cached.value;
}

export async function clearAuthSessionSnapshot(): Promise<void> {
  await deleteCache(AUTH_SESSION_KEY);
}

export async function saveActivePatrolSnapshot(userId: string, patrol: Patrol): Promise<void> {
  await writeCache(activePatrolKey(userId), patrol);
}

export async function loadActivePatrolSnapshot(userId: string): Promise<Patrol | null> {
  const cached = await readCache<unknown>(activePatrolKey(userId));
  return cached && isPatrol(cached.value) ? cached.value : null;
}

export async function savePatrolRouteSnapshot(
  userId: string,
  patrolId: string,
  points: PatrolSnapshotPoint[],
): Promise<void> {
  await writeCache(routeKey(userId, patrolId), points);
}

export async function loadPatrolRouteSnapshot(
  userId: string,
  patrolId: string,
): Promise<PatrolSnapshotPoint[] | null> {
  const cached = await readCache<unknown>(routeKey(userId, patrolId));
  return cached && isRoute(cached.value) ? cached.value : null;
}

export async function saveNfcWaitStateSnapshot(
  userId: string,
  patrolId: string,
  state: NfcWaitStateDto,
): Promise<void> {
  await writeCache(waitStateKey(userId, patrolId), state);
}

export async function loadNfcWaitStateSnapshot(
  userId: string,
  patrolId: string,
): Promise<NfcWaitStateDto | null> {
  const cached = await readCache<unknown>(waitStateKey(userId, patrolId));
  return cached && isNfcWaitState(cached.value) ? cached.value : null;
}

export async function clearActivePatrolSnapshot(
  userId: string,
  patrolId?: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `DELETE FROM ${RUNTIME_CACHE_TABLE}
     WHERE cache_key = ? OR cache_key LIKE ? OR cache_key LIKE ?`,
    [
      activePatrolKey(userId),
      patrolId ? routeKey(userId, patrolId) : `route:${userId}:%`,
      patrolId ? waitStateKey(userId, patrolId) : `wait:${userId}:%`,
    ],
  );
}

export async function clearUserRuntimeSnapshots(userId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `DELETE FROM ${RUNTIME_CACHE_TABLE}
     WHERE cache_key = ? OR cache_key LIKE ? OR cache_key LIKE ?`,
    [activePatrolKey(userId), `route:${userId}:%`, `wait:${userId}:%`],
  );
}

async function writeCache(key: string, value: unknown): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO ${RUNTIME_CACHE_TABLE} (cache_key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), Date.now()],
  );
}

async function readCache<T>(key: string): Promise<{ updatedAt: number; value: T } | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<CacheRow>(
    `SELECT value_json, updated_at FROM ${RUNTIME_CACHE_TABLE} WHERE cache_key = ?`,
    [key],
  );
  if (!row) {
    return null;
  }
  try {
    return { updatedAt: row.updated_at, value: JSON.parse(row.value_json) as T };
  } catch {
    await deleteCache(key);
    return null;
  }
}

async function deleteCache(key: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM ${RUNTIME_CACHE_TABLE} WHERE cache_key = ?`, [key]);
}

function activePatrolKey(userId: string): string {
  return `active:${userId}`;
}

function routeKey(userId: string, patrolId: string): string {
  return `route:${userId}:${patrolId}`;
}

function waitStateKey(userId: string, patrolId: string): string {
  return `wait:${userId}:${patrolId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMobileSession(value: unknown): value is MobileMeResponse {
  return (
    isRecord(value) &&
    isRecord(value.user) &&
    typeof value.user.id === 'string' &&
    typeof value.user.role === 'string' &&
    isRecord(value.capabilities)
  );
}

function isPatrol(value: unknown): value is Patrol {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.shopId === 'string' &&
    typeof value.status === 'string' &&
    typeof value.scannedPoints === 'number' &&
    typeof value.totalPoints === 'number'
  );
}

function isRoute(value: unknown): value is PatrolSnapshotPoint[] {
  return (
    Array.isArray(value) &&
    value.every(
      (point) =>
        isRecord(point) &&
        typeof point.id === 'string' &&
        typeof point.name === 'string' &&
        typeof point.sortOrder === 'number' &&
        typeof point.dwellSeconds === 'number',
    )
  );
}

function isNfcWaitState(value: unknown): value is NfcWaitStateDto {
  return (
    isRecord(value) &&
    typeof value.patrolId === 'string' &&
    typeof value.mode === 'string' &&
    typeof value.pointDwellSeconds === 'number' &&
    typeof value.scannedPoints === 'number' &&
    typeof value.totalPoints === 'number'
  );
}
