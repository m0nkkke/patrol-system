import { create } from 'zustand';

import { getMe, login, logout, refreshTokens } from '@/api/auth.api';
import { setRefreshHandler, setTokenProvider, setUnauthorizedHandler } from '@/api/client';
import type { MobileCapabilities, MobileUser } from '@/api/types';
import { getDeviceId } from '@/device/device-id';
import { logger } from '@/lib/logger';
import { secureStorage } from '@/storage/secure-store';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: MobileUser | null;
  capabilities: MobileCapabilities | null;
  bootstrap: () => Promise<void>;
  signIn: (accessKey: string) => Promise<void>;
  signOut: () => Promise<void>;
};

let wired = false;

export const useAuthStore = create<AuthState>((set, get) => {
  if (!wired) {
    wired = true;
    setTokenProvider(() => get().accessToken);
    setUnauthorizedHandler(() => {
      void get().signOut();
    });
    setRefreshHandler(refreshSession);
  }

  async function loadSession(): Promise<void> {
    const me = await getMe();
    logger.setUser({ id: me.user.id, role: me.user.role });
    set({ status: 'authenticated', user: me.user, capabilities: me.capabilities });
  }

  async function refreshSession(): Promise<string | null> {
    const currentRefreshToken = get().refreshToken;
    if (!currentRefreshToken) {
      return null;
    }
    try {
      const deviceId = await getDeviceId();
      const tokens = await refreshTokens({ refreshToken: currentRefreshToken, deviceId });
      await secureStorage.saveTokens(tokens);
      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return tokens.accessToken;
    } catch {
      return null;
    }
  }

  return {
    status: 'initializing',
    accessToken: null,
    refreshToken: null,
    user: null,
    capabilities: null,

    async bootstrap() {
      const tokens = await secureStorage.loadTokens();
      if (!tokens) {
        set({ status: 'unauthenticated' });
        return;
      }

      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      try {
        await loadSession();
      } catch {
        await get().signOut();
      }
    },

    async signIn(accessKey) {
      const deviceId = await getDeviceId();
      const tokens = await login({ accessKey, deviceId });
      await secureStorage.saveTokens(tokens);
      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      await loadSession();
    },

    async signOut() {
      const currentRefreshToken = get().refreshToken;
      if (currentRefreshToken) {
        try {
          const deviceId = await getDeviceId();
          await logout({ refreshToken: currentRefreshToken, deviceId });
        } catch {
          // Выходим в любом случае, даже если отозвать токен на сервере не удалось.
        }
      }
      await secureStorage.clearTokens();
      logger.setUser(null);
      set({
        status: 'unauthenticated',
        accessToken: null,
        refreshToken: null,
        user: null,
        capabilities: null,
      });
    },
  };
});
