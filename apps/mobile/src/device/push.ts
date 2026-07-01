import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDevicePushToken } from '@/api/notifications.api';

import { getDeviceId } from './device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof easProjectId === 'string' && easProjectId.length > 0) {
    return easProjectId;
  }
  return Constants.easConfig?.projectId;
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Уведомления обходов',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function ensurePermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

export async function registerPushToken(): Promise<void> {
  try {
    await configureAndroidChannel();

    if (!Device.isDevice) {
      return;
    }

    if (!(await ensurePermission())) {
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      return;
    }

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const deviceId = await getDeviceId();

    await registerDevicePushToken({
      deviceId,
      pushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: Constants.expoConfig?.version ?? undefined,
    });
  } catch {
    // Регистрация пуш-токена не критична для работы приложения.
  }
}
