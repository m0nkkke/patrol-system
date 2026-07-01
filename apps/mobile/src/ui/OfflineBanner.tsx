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
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.textInverse} />
      <AppText variant="caption" color={colors.textInverse} style={styles.text}>
        Нет соединения — данные синхронизируются позже
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.warning,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  text: {
    marginLeft: spacing.xs,
  },
});
