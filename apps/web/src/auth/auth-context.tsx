import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '../lib/api';
import { clearTokens, getDeviceId, readTokens, saveTokens } from '../lib/session';
import type { AuthProfile, AuthTokens } from '../types/api';

type AuthState = {
  isLoading: boolean;
  login: (accessKey: string) => Promise<void>;
  logout: () => Promise<void>;
  profile: AuthProfile | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(() => readTokens() !== null);

  const loadProfile = useCallback(async (): Promise<AuthProfile> => {
    const response = await api.get<AuthProfile>('/auth/me');
    const webProfile = assertWebProfile(response.data);
    setProfile(webProfile);
    return webProfile;
  }, []);

  useEffect(() => {
    const expire = (): void => setProfile(null);
    window.addEventListener('patrol:session-expired', expire);
    if (readTokens() !== null) {
      void api.get<AuthProfile>('/auth/me')
        .then((response) => setProfile(assertWebProfile(response.data)))
        .catch(() => clearTokens())
        .finally(() => setIsLoading(false));
    }
    return () => window.removeEventListener('patrol:session-expired', expire);
  }, [loadProfile]);

  const login = useCallback(async (accessKey: string): Promise<void> => {
    const response = await api.post<AuthTokens>('/auth/login', {
      accessKey,
      deviceId: getDeviceId(),
    });
    saveTokens(response.data);
    try {
      await loadProfile();
    } catch (error) {
      clearTokens();
      throw error;
    }
  }, [loadProfile]);

  const logout = useCallback(async (): Promise<void> => {
    const tokens = readTokens();
    try {
      if (tokens !== null) {
        await api.post('/auth/logout', { deviceId: getDeviceId(), refreshToken: tokens.refreshToken });
      }
    } finally {
      clearTokens();
      setProfile(null);
    }
  }, []);

  const value = useMemo(() => ({ isLoading, login, logout, profile }), [isLoading, login, logout, profile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function assertWebProfile(profile: AuthProfile): AuthProfile {
  if (profile.role !== 'inspector' && profile.role !== 'admin') {
    throw new Error('Эта роль не имеет доступа к web-панели');
  }
  return profile;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === null) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
