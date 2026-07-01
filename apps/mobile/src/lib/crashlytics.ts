import {
  getCrashlytics,
  log,
  recordError,
  setAttribute,
  setAttributes,
  setUserId,
} from '@react-native-firebase/crashlytics';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const crashlytics = getCrashlytics();

type CrashContext = Record<string, unknown>;

function stringifyContextValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.slice(0, 180);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value).slice(0, 180);
  } catch {
    return '[unserializable]';
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('Unknown JS error');
}

export function initCrashlytics(): void {
  if (__DEV__) {
    return;
  }
  void setAttributes(crashlytics, {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    channel: Updates.channel ?? 'embedded',
    runtimeVersion: Updates.runtimeVersion ?? 'unknown',
  });
}

export function logCrash(message: string, context?: CrashContext): void {
  if (__DEV__) {
    return;
  }
  log(crashlytics, message);
  if (context) {
    void setAttributes(
      crashlytics,
      Object.fromEntries(
        Object.entries(context).map(([key, value]) => [key, stringifyContextValue(value)]),
      ),
    );
  }
}

export function reportError(error: unknown, context?: CrashContext): void {
  if (__DEV__) {
    return;
  }
  if (context) {
    logCrash('JS error context', context);
  }
  recordError(crashlytics, normalizeError(error));
}

export function setCrashUser(user: { id: string; role?: string } | null): void {
  if (__DEV__) {
    return;
  }
  void setUserId(crashlytics, user?.id ?? '');
  if (user?.role) {
    void setAttribute(crashlytics, 'userRole', user.role);
  }
}
