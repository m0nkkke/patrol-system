import * as Crypto from 'expo-crypto';

import { secureStorage } from '@/storage/secure-store';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const existing = await secureStorage.getDeviceId();
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }

  const generated = Crypto.randomUUID();
  await secureStorage.saveDeviceId(generated);
  cachedDeviceId = generated;
  return generated;
}
