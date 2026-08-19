import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { clearTokens, getDeviceId, readTokens, saveTokens } from './session';
import type { AuthTokens } from '../types/api';

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const baseURL = typeof configuredApiUrl === 'string'
  ? configuredApiUrl
  : 'http://127.0.0.1:3000/api/v1';

export const api = axios.create({ baseURL, timeout: 15_000 });
const refreshApi = axios.create({ baseURL, timeout: 15_000 });
let refreshRequest: Promise<AuthTokens> | null = null;

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const tokens = readTokens();
  if (tokens !== null) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    const request = error.config as RetriableRequest | undefined;
    const tokens = readTokens();
    if (error.response?.status !== 401 || request === undefined || request._retry || tokens === null) {
      return Promise.reject(toError(error));
    }

    request._retry = true;
    refreshRequest ??= refreshApi
      .post<AuthTokens>('/auth/refresh', {
        deviceId: getDeviceId(),
        refreshToken: tokens.refreshToken,
      })
      .then((response) => {
        saveTokens(response.data);
        return response.data;
      })
      .finally(() => {
        refreshRequest = null;
      });

    try {
      const refreshed = await refreshRequest;
      request.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return api(request);
    } catch (refreshError) {
      clearTokens();
      window.dispatchEvent(new Event('patrol:session-expired'));
      return Promise.reject(toError(refreshError));
    }
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Не удалось выполнить запрос';
  const data: unknown = error.response?.data;
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join('. ');
  }
  if (error.code === 'ECONNABORTED') return 'Сервер не ответил вовремя';
  if (error.request !== undefined && error.response === undefined) return 'Backend недоступен';
  return 'Не удалось выполнить запрос';
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('API request failed');
}
