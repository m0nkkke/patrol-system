import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import { clearTokens, getDeviceId, readTokens, saveTokens, sessionGeneration } from '../lib/session';
import type { AuthProfile, AuthTokens } from '../types/api';

type AuthState = {
  isLoading: boolean;
  login: (accessKey: string, actorFullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  profile: AuthProfile | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const queryClient = useQueryClient();
  const resetCache = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(() => readTokens() !== null);

  const loadProfile = useCallback(async (): Promise<AuthProfile> => {
    const response = await api.get<AuthProfile>('/auth/me');
    const webProfile = assertWebProfile(response.data);
    setProfile(webProfile);
    return webProfile;
  }, []);

  useEffect(() => {
    let active = true;
    const generation = sessionGeneration();
    const expire = (): void => { resetCache(); setProfile(null); setIsLoading(false); };
    window.addEventListener('patrol:session-expired', expire);
    if (readTokens() !== null) {
      void api.get<AuthProfile>('/auth/me')
        .then((response) => { if (active && generation === sessionGeneration()) setProfile(assertWebProfile(response.data)); })
        .catch(() => { if (active && generation === sessionGeneration()) clearTokens(); })
        .finally(() => { if (active) setIsLoading(false); });
    }
    return () => { active = false; window.removeEventListener('patrol:session-expired', expire); };
  }, [loadProfile, resetCache]);

  const login = useCallback(async (accessKey: string, actorFullName?: string): Promise<void> => {
    clearTokens();
    resetCache();
    const generation = sessionGeneration();
    const response = await api.post<AuthTokens>(actorFullName ? '/auth/universal-route-setter/login' : '/auth/login', {
      accessKey,
      ...(actorFullName ? { actorFullName } : {}),
      deviceId: getDeviceId(),
    });
    saveTokens(response.data);
    try {
      await loadProfile();
    } catch (error) {
      if (generation === sessionGeneration()) clearTokens();
      throw error;
    }
  }, [loadProfile, resetCache]);

  const logout = useCallback(async (): Promise<void> => {
    const tokens = readTokens();
    clearTokens();
    resetCache();
    setProfile(null);
    try {
      if (tokens !== null) {
        await api.post('/auth/logout', { deviceId: getDeviceId(), refreshToken: tokens.refreshToken }, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
      }
    } catch {
      // Local access is already removed, including when revocation cannot reach the server.
    }
  }, [resetCache]);

  const value = useMemo(() => ({ isLoading, login, logout, profile }), [isLoading, login, logout, profile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function assertWebProfile(profile: AuthProfile): AuthProfile {
  if (!['admin', 'inspector', 'route_setter', 'local_route_setter'].includes(profile.role)) {
    throw new Error('Эта роль не имеет доступа к web-панели');
  }
  return profile;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === null) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
