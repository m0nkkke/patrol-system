import { initCrashlytics, reportError, setCrashUser } from './crashlytics';

let initialized = false;

export function initLogging(): void {
  if (initialized) {
    return;
  }
  initCrashlytics();
  initialized = true;
}

export const logger = {
  error(error: unknown, context?: Record<string, unknown>): void {
    reportError(error, context);
    if (__DEV__) {
      console.error(error, context ?? '');
    }
  },

  setUser(user: { id: string; role?: string } | null): void {
    setCrashUser(user);
  },
};
