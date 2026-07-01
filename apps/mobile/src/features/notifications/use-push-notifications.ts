import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { registerPushToken } from '@/device/push';
import { useAuthStore } from '@/store/auth-store';

function extractPatrolId(response: Notifications.NotificationResponse): string | undefined {
  const patrolId = response.notification.request.content.data?.patrolId;
  return typeof patrolId === 'string' && patrolId.length > 0 ? patrolId : undefined;
}

export function usePushNotifications(): void {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'authenticated') {
      void registerPushToken();
    }
  }, [status]);

  useEffect(() => {
    function openPatrol(response: Notifications.NotificationResponse): void {
      const patrolId = extractPatrolId(response);
      if (patrolId) {
        router.push({ pathname: '/history/patrol/[id]', params: { id: patrolId } });
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openPatrol(response);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(openPatrol);
    return () => subscription.remove();
  }, [router]);
}
