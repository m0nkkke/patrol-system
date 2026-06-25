import { create } from 'zustand';

import { getMe, login } from '@/api/auth.api';
import { setTokenProvider, setUnauthorizedHandler } from '@/api/client';
import type { MobileCapabilities, MobileUser } from '@/api/types';
import { getDeviceId } from '@/device/device-id';
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
  }

  async function loadSession(): Promise<void> {
    const me = await getMe();
    set({ status: 'authenticated', user: me.user, capabilities: me.capabilities });
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
      await secureStorage.clearTokens();
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
