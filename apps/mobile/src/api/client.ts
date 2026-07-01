import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';

import { toApiError } from './errors';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;
type RefreshHandler = () => Promise<string | null>;
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let tokenProvider: TokenProvider = () => null;
let unauthorizedHandler: UnauthorizedHandler = () => undefined;
let refreshHandler: RefreshHandler = async () => null;
let refreshing: Promise<string | null> | null = null;

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export function setRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isCriticalEndpoint(url?: string): boolean {
  if (!url) {
    return false;
  }
  return [
    '/auth/',
    '/mobile/me',
    '/mobile/shops',
    '/mobile/patrols',
    '/mobile/route-setup',
    '/mobile/patrol-events',
  ].some((part) => url.includes(part));
}

function shouldReportApiError(status: number | undefined, config?: RetriableConfig): boolean {
  if (status === undefined) {
    return false;
  }
  if (status >= 500) {
    return true;
  }
  if (status === 403) {
    return true;
  }
  if (status === 401 && config?._retried) {
    return true;
  }
  return (status === 408 || status === 429) && isCriticalEndpoint(config?.url);
}

apiClient.interceptors.request.use((config) => {
  const token = tokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as AxiosError;
    const config = axiosError.config as RetriableConfig | undefined;
    const status = axiosError.response?.status;

    // Истёк access-токен — пробуем один раз обновить его и повторить запрос.
    if (status === 401 && config && !config.skipAuthRefresh && !config._retried) {
      config._retried = true;

      refreshing ??= refreshHandler().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;

      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }

      unauthorizedHandler();
    }

    if (shouldReportApiError(status, config)) {
      logger.error(axiosError, {
        source: 'api',
        url: config?.url,
        method: config?.method,
        status,
      });
    }

    return Promise.reject(toApiError(error));
  },
);
