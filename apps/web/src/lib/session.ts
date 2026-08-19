import type { AuthTokens } from '../types/api';

const ACCESS_TOKEN_KEY = 'patrol.web.access-token';
const REFRESH_TOKEN_KEY = 'patrol.web.refresh-token';
const DEVICE_ID_KEY = 'patrol.web.device-id';

// PRODUCTION BLOCKER: browser-readable tokens are allowed only for the development MVP.
// Before production, replace this module with backend-managed HttpOnly Secure cookies,
// an explicit SameSite policy and CSRF protection. Do not move tokens to localStorage.
export function readTokens(): AuthTokens | null {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  return accessToken !== null && refreshToken !== null ? { accessToken, refreshToken } : null;
}

export function saveTokens(tokens: AuthTokens): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing !== null) return existing;
  const deviceId = `web-${crypto.randomUUID()}`;
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
