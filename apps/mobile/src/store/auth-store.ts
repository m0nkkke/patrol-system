import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

import {
  getMe,
  login,
  loginUniversalRouteSetter,
  logout,
  refreshTokens,
} from '@/api/auth.api';
import { setRefreshHandler, setTokenProvider, setUnauthorizedHandler } from '@/api/client';
import { ApiError } from '@/api/errors';
import { queryClient } from '@/api/query-client';
import type { MobileCapabilities, MobileMeResponse, MobileUser } from '@/api/types';
import { getDeviceId } from '@/device/device-id';
import {
  clearAuthSessionSnapshot,
  clearUserRuntimeSnapshots,
  loadAuthSessionSnapshot,
  saveAuthSessionSnapshot,
} from '@/features/patrol/offline/runtime-cache';
import { logger } from '@/lib/logger';
import { secureStorage } from '@/storage/secure-store';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: MobileUser | null;
  capabilities: MobileCapabilities | null;
  selectedShopId: string | null;
  bootstrap: () => Promise<void>;
  signIn: (accessKey: string) => Promise<void>;
  signInUniversalRouteSetter: (accessKey: string, actorFullName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  selectShop: (shopId: string) => Promise<void>;
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

  async function applySession(me: MobileMeResponse, persist: boolean): Promise<void> {
    const previousShopId = get().selectedShopId;
    const assignedShopIds = me.user.shopIds ?? (me.user.shopId ? [me.user.shopId] : []);
    const storedShopId = await secureStorage.getSelectedShopId();
    const selectedShopId =
      me.user.role === 'security_guard'
        ? storedShopId && assignedShopIds.includes(storedShopId)
          ? storedShopId
          : assignedShopIds.length === 1
            ? assignedShopIds[0] ?? null
            : null
        : me.user.shopId ?? null;

    if (selectedShopId !== null) {
      await secureStorage.saveSelectedShopId(selectedShopId);
    } else {
      await secureStorage.clearSelectedShopId();
    }
    if (persist) {
      await saveAuthSessionSnapshot(me).catch((error: unknown) => {
        logger.error(error, { source: 'offline-session-cache' });
      });
    }
    logger.setUser({ id: me.user.id, role: me.user.role });
    set({
      status: 'authenticated',
      user: me.user,
      capabilities: me.capabilities,
      selectedShopId,
    });
    if (previousShopId !== null && previousShopId !== selectedShopId) {
      void queryClient.invalidateQueries({ queryKey: ['active-patrol'] });
      void queryClient.invalidateQueries({ queryKey: ['available-schedules'] });
      void queryClient.invalidateQueries({ queryKey: ['patrol-route'] });
      void queryClient.invalidateQueries({ queryKey: ['schedule-plan'] });
    }
  }

  async function loadSession(): Promise<void> {
    const me = await getMe();
    await applySession(me, true);
  }

  async function clearLocalSession(userId?: string): Promise<void> {
    await secureStorage.clearTokens().catch(reportLocalStorageError);
    await secureStorage.clearSelectedShopId().catch(reportLocalStorageError);
    await clearAuthSessionSnapshot().catch(reportLocalStorageError);
    if (userId) {
      await clearUserRuntimeSnapshots(userId).catch(reportLocalStorageError);
    }
    queryClient.clear();
    logger.setUser(null);
    set({
      status: 'unauthenticated',
      accessToken: null,
      refreshToken: null,
      user: null,
      capabilities: null,
      selectedShopId: null,
    });
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
    selectedShopId: null,

    async bootstrap() {
      const tokens = await secureStorage.loadTokens();
      if (!tokens) {
        set({ status: 'unauthenticated' });
        return;
      }

      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      const connection = await NetInfo.fetch().catch(() => null);
      if (connection?.isConnected === false) {
        const snapshot = await loadAuthSessionSnapshot().catch((cacheError: unknown) => {
          reportLocalStorageError(cacheError);
          return null;
        });
        if (snapshot) {
          await applySession(snapshot, false);
          return;
        }
        await clearLocalSession();
        return;
      }
      try {
        await loadSession();
      } catch (error) {
        if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
          const snapshot = await loadAuthSessionSnapshot().catch((cacheError: unknown) => {
            reportLocalStorageError(cacheError);
            return null;
          });
          if (snapshot) {
            await applySession(snapshot, false);
            return;
          }
        }
        await clearLocalSession();
      }
    },

    async signIn(accessKey) {
      const deviceId = await getDeviceId();
      const tokens = await login({ accessKey, deviceId });
      await clearAuthSessionSnapshot().catch(reportLocalStorageError);
      await secureStorage.saveTokens(tokens);
      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      await loadSession();
    },

    async signInUniversalRouteSetter(accessKey, actorFullName) {
      const deviceId = await getDeviceId();
      const tokens = await loginUniversalRouteSetter({ accessKey, actorFullName, deviceId });
      await clearAuthSessionSnapshot().catch(reportLocalStorageError);
      await secureStorage.saveTokens(tokens);
      set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      await loadSession();
    },

    async refreshProfile() {
      await loadSession();
    },

    async selectShop(shopId) {
      const currentShopId = get().selectedShopId;
      const user = get().user;
      const assignedShopIds = user?.shopIds ?? (user?.shopId ? [user.shopId] : []);
      if (!assignedShopIds.includes(shopId)) {
        throw new Error('Выбранный магазин не назначен пользователю.');
      }
      await secureStorage.saveSelectedShopId(shopId);
      set({ selectedShopId: shopId });
      if (currentShopId !== shopId) {
        void queryClient.invalidateQueries({ queryKey: ['active-patrol'] });
        void queryClient.invalidateQueries({ queryKey: ['available-schedules'] });
        void queryClient.invalidateQueries({ queryKey: ['patrol-route'] });
        void queryClient.invalidateQueries({ queryKey: ['schedule-plan'] });
      }
    },

    async signOut() {
      const currentRefreshToken = get().refreshToken;
      const currentUserId = get().user?.id;
      if (currentRefreshToken) {
        try {
          const deviceId = await getDeviceId();
          await logout({ refreshToken: currentRefreshToken, deviceId });
        } catch {
          // Выходим в любом случае, даже если отозвать токен на сервере не удалось.
        }
      }
      await clearLocalSession(currentUserId);
    },
  };
});

function reportLocalStorageError(error: unknown): void {
  logger.error(error, { source: 'local-session-storage' });
}
