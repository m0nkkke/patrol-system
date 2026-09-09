import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { env } from '@/config/env';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type ProtectedImageProps = {
  fileId: string;
  accessibilityLabel: string;
  style: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
};

export function ProtectedImage({
  fileId,
  accessibilityLabel,
  style,
  resizeMode = 'cover',
}: ProtectedImageProps): React.ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function handleLocalImageError(): void {
    const uri = localUri;
    setLocalUri(null);
    setFailed(true);
    if (uri) {
      void FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }

  useEffect(() => {
    let active = true;
    setLocalUri(null);
    setFailed(false);

    async function load(): Promise<void> {
      if (!accessToken || !FileSystem.cacheDirectory) {
        setFailed(true);
        return;
      }

      const cachedUri = `${FileSystem.cacheDirectory}patrol-file-${fileId}.webp`;
      try {
        const cached = await FileSystem.getInfoAsync(cachedUri);
        if (!cached.exists) {
          const remoteUri = `${env.apiBaseUrl.replace(/\/$/, '')}/files/${fileId}`;
          const result = await FileSystem.downloadAsync(remoteUri, cachedUri, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (result.status < 200 || result.status >= 300) {
            throw new Error(`Protected file request failed with status ${result.status}`);
          }
        }
        if (active) {
          setLocalUri(cachedUri);
        }
      } catch {
        if (active) {
          setFailed(true);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [accessToken, fileId]);

  return (
    <View style={[styles.container, style]}>
      {localUri ? (
        <Image
          source={{ uri: localUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          accessibilityLabel={accessibilityLabel}
          onError={handleLocalImageError}
        />
      ) : failed ? (
        <View style={styles.state}>
          <AppText variant="caption" muted style={styles.message}>
            Не удалось загрузить фотографию
          </AppText>
        </View>
      ) : (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    textAlign: 'center',
  },
});
