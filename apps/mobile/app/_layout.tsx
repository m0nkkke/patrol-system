import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/query-client';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';
import { startSyncManager } from '@/features/patrol/offline/sync-manager';
import { useOtaUpdates } from '@/features/updates/use-ota-updates';
import { initLogging } from '@/lib/logger';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/theme';
import { ErrorBoundary, OfflineBanner } from '@/ui';

initLogging();

function useAuthRedirect(): void {
  const status = useAuthStore((state) => state.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'initializing') {
      return;
    }

    const inAuthGroup = segments[0] === 'login';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/');
    }
  }, [status, segments, router]);
}

export default function RootLayout(): React.ReactElement {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => startSyncManager(), []);

  useAuthRedirect();
  usePushNotifications();
  useOtaUpdates();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <OfflineBanner />
        <View style={styles.flex}>
          <ErrorBoundary>
            {status === 'initializing' ? (
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
