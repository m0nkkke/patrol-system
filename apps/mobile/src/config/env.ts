import Constants from 'expo-constants';

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof fromExtra === 'string' && fromExtra.length > 0) {
    return fromExtra;
  }

  throw new Error('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL.');
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
