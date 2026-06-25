import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { useAuthStore } from '@/store/auth-store';

import { syncPendingEvents } from './sync';

const SYNC_INTERVAL_MS = 30_000;
let started = false;

async function trySync(): Promise<void> {
  if (!useAuthStore.getState().accessToken) {
    return;
  }
  await syncPendingEvents();
}

export function requestSync(): void {
  void trySync();
}

export function startSyncManager(): () => void {
  if (started) {
    return () => undefined;
  }
  started = true;

  const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void trySync();
    }
  });
  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void trySync();
    }
  });
  const interval = setInterval(() => void trySync(), SYNC_INTERVAL_MS);

  return () => {
    netInfoUnsubscribe();
    appStateSubscription.remove();
    clearInterval(interval);
    started = false;
  };
}
