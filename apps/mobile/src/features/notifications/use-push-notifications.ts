import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { registerPushToken } from '@/device/push';
import { useAuthStore } from '@/store/auth-store';

function extractPatrolId(response: Notifications.NotificationResponse): string | undefined {
  const patrolId = response.notification.request.content.data?.patrolId;
  return typeof patrolId === 'string' && patrolId.length > 0 ? patrolId : undefined;
}

function extractShopId(response: Notifications.NotificationResponse): string | undefined {
  const data = response.notification.request.content.data;
  const shopId = data?.shopId;
  return data?.type === 'patrol_schedule_available' && typeof shopId === 'string'
    ? shopId
    : undefined;
}

function extractIncidentId(response: Notifications.NotificationResponse): string | undefined {
  const incidentId = response.notification.request.content.data?.incidentId;
  return typeof incidentId === 'string' && incidentId.length > 0 ? incidentId : undefined;
}

export function usePushNotifications(): void {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const handledResponses = useRef(new Set<string>());

  useEffect(() => {
    if (status === 'authenticated') {
      void registerPushToken();
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return undefined;
    }

    async function openNotification(response: Notifications.NotificationResponse): Promise<void> {
      const identifier = response.notification.request.identifier;
      if (handledResponses.current.has(identifier)) {
        return;
      }
      handledResponses.current.add(identifier);

      const shopId = extractShopId(response);
      if (shopId) {
        const auth = useAuthStore.getState();
        const assignedShopIds = auth.user?.shopIds ?? (auth.user?.shopId ? [auth.user.shopId] : []);
        if (assignedShopIds.includes(shopId)) {
          await auth.selectShop(shopId);
          router.push('/patrol');
        }
        return;
      }

      const incidentId = extractIncidentId(response);
      if (incidentId) {
        router.push({ pathname: '/incident/[id]', params: { id: incidentId } });
        return;
      }

      const patrolId = extractPatrolId(response);
      if (patrolId) {
        const role = useAuthStore.getState().user?.role;
        if (role === 'admin' || role === 'inspector') {
          router.push({ pathname: '/control-patrols/[id]', params: { id: patrolId } });
        } else {
          router.push({ pathname: '/history/patrol/[id]', params: { id: patrolId } });
        }
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void openNotification(response);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void openNotification(response);
    });
    return () => subscription.remove();
  }, [router, status]);
}
