import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/query-client';
import { canAccessRoute } from '@/features/auth/route-access';
import { useSessionHeartbeat } from '@/features/auth/use-session-heartbeat';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';
import { useSchedulePlan } from '@/features/notifications/use-schedule-plan';
import { startSyncManager } from '@/features/patrol/offline/sync-manager';
import { useOtaUpdates } from '@/features/updates/use-ota-updates';
import { initLogging } from '@/lib/logger';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { ErrorBoundary, OfflineBanner } from '@/ui';

initLogging();

function AppServices(): null {
  useSchedulePlan();
  return null;
}

function useAuthRedirect(): boolean {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const selectedShopId = useAuthStore((state) => state.selectedShopId);
  const segments = useSegments();
  const router = useRouter();
  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === 'login';
  const inShopSelection = rootSegment === 'select-shop';
  const needsShopSelection =
    status === 'authenticated' && role === 'security_guard' && selectedShopId === null;
  const canRenderRoute =
    status === 'unauthenticated'
      ? inAuthGroup
      : status === 'authenticated' &&
        !inAuthGroup &&
        (!needsShopSelection || inShopSelection) &&
        canAccessRoute(role, rootSegment);

  useEffect(() => {
    if (status === 'initializing') {
      return;
    }

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/login');
    } else if (needsShopSelection && !inShopSelection) {
      router.replace('/select-shop');
    } else if (status === 'authenticated' && !needsShopSelection && inAuthGroup) {
      router.replace('/');
    } else if (
      status === 'authenticated' &&
      !needsShopSelection &&
      !canAccessRoute(role, rootSegment)
    ) {
      router.replace('/');
    }
  }, [inAuthGroup, inShopSelection, needsShopSelection, role, rootSegment, router, status]);

  return canRenderRoute;
}

export default function RootLayout(): React.ReactElement {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => startSyncManager(), []);

  const canRenderRoute = useAuthRedirect();
  useSessionHeartbeat();
  usePushNotifications();
  useOtaUpdates();

  return (
    <QueryClientProvider client={queryClient}>
      <AppServices />
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <View style={styles.flex}>
          <ErrorBoundary>
            {status === 'initializing' || !canRenderRoute ? (
              <View style={styles.splash}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <Stack screenOptions={{ headerShown: false }} />
            )}
          </ErrorBoundary>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  splash: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
