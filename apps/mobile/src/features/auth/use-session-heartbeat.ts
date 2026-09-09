import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/store/auth-store';

const HEARTBEAT_INTERVAL_MS = 60_000;

export function useSessionHeartbeat(): void {
  const status = useAuthStore((state) => state.status);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  useEffect(() => {
    if (status !== 'authenticated') {
      return undefined;
    }

    let checking = false;
    async function checkSession(): Promise<void> {
      if (checking) {
        return;
      }
      checking = true;
      try {
        await refreshProfile();
      } catch {
        // 401 обрабатывает общий interceptor, отсутствие сети не завершает сессию.
      } finally {
        checking = false;
      }
    }

    const interval = setInterval(() => void checkSession(), HEARTBEAT_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkSession();
      }
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [refreshProfile, status]);
}
