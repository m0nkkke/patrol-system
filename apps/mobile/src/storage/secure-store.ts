import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'patrol.accessToken',
  refreshToken: 'patrol.refreshToken',
  deviceId: 'patrol.deviceId',
} as const;

type StorageKey = (typeof KEYS)[keyof typeof KEYS];

async function setItem(key: StorageKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: StorageKey): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: StorageKey): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export const secureStorage = {
  async saveTokens(tokens: StoredTokens): Promise<void> {
    await setItem(KEYS.accessToken, tokens.accessToken);
    await setItem(KEYS.refreshToken, tokens.refreshToken);
  },

  async loadTokens(): Promise<StoredTokens | null> {
    const accessToken = await getItem(KEYS.accessToken);
    const refreshToken = await getItem(KEYS.refreshToken);
    if (!accessToken || !refreshToken) {
      return null;
    }
    return { accessToken, refreshToken };
  },

  async clearTokens(): Promise<void> {
    await removeItem(KEYS.accessToken);
    await removeItem(KEYS.refreshToken);
  },

  getDeviceId(): Promise<string | null> {
    return getItem(KEYS.deviceId);
  },

  async saveDeviceId(deviceId: string): Promise<void> {
    await setItem(KEYS.deviceId, deviceId);
  },
};
