function resolveApiBaseUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/$/, '');
  }

  throw new Error('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL.');
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
