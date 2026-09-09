import * as Crypto from 'expo-crypto';

import { getDatabase, PATROL_MISSED_POINT_ATTEMPTS_TABLE } from '@/db';

export type LocalMissedPointAttemptInput = {
  userId: string;
  attemptedPatrolPointId: string;
  deviceId: string;
  expectedPatrolPointId: string;
  nfcUid: string;
  patrolId: string;
  scannedAt: string;
};

export async function createLocalMissedPointAttempt(
  input: LocalMissedPointAttemptInput,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO ${PATROL_MISSED_POINT_ATTEMPTS_TABLE}
       (local_id, user_id, patrol_id, expected_patrol_point_id, attempted_patrol_point_id,
        nfc_uid, scanned_at, device_id, queue_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      Crypto.randomUUID(),
      input.userId,
      input.patrolId,
      input.expectedPatrolPointId,
      input.attemptedPatrolPointId,
      input.nfcUid,
      input.scannedAt,
      input.deviceId,
    ],
  );
}
