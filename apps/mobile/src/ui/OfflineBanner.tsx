import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsOffline } from '@/lib/use-network-status';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export function OfflineBanner(): React.ReactElement | null {
  const offline = useIsOffline();
  const insets = useSafeAreaInsets();

  if (!offline) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.banner, { top: insets.top + 2 }]}
    >
      <Ionicons name="cloud-offline-outline" size={12} color={colors.textInverse} />
      <AppText color={colors.textInverse} style={styles.text}>
        Нет соединения с интернетом
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: 6,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    left: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 1000,
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    marginLeft: spacing.xs,
  },
});
