import * as Crypto from 'expo-crypto';

import { getDatabase, PATROL_EVENTS_TABLE } from '@/db';

export type LocalEventInput = {
  patrolId: string;
  patrolPointId: string;
  nfcUid: string;
  deviceId: string;
  scannedAt: string;
  lat?: number;
  lng?: number;
  gpsAccuracy?: number;
};

export async function createLocalEvent(input: LocalEventInput): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO ${PATROL_EVENTS_TABLE}
       (local_id, patrol_id, patrol_point_id, nfc_uid, scanned_at, device_id, lat, lng, gps_accuracy, queue_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      Crypto.randomUUID(),
      input.patrolId,
      input.patrolPointId,
      input.nfcUid,
      input.scannedAt,
      input.deviceId,
      input.lat ?? null,
      input.lng ?? null,
      input.gpsAccuracy ?? null,
    ],
  );
}
