import * as Updates from 'expo-updates';
import { useEffect } from 'react';

export function useOtaUpdates(): void {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    let cancelled = false;

    async function applyUpdate(): Promise<void> {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (cancelled || !result.isAvailable) {
          return;
        }
        await Updates.fetchUpdateAsync();
        if (!cancelled) {
          await Updates.reloadAsync();
        }
      } catch {
        // Обновления не критичны — продолжаем работать на текущей версии.
      }
    }

    void applyUpdate();

    return () => {
      cancelled = true;
    };
  }, []);
}
