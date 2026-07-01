import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type AppToastTone = 'danger' | 'info' | 'success' | 'warning';

type AppToastProps = {
  message: string | null | undefined;
  tone?: AppToastTone;
};

const toneConfig: Record<AppToastTone, { background: string; border: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  danger: {
    background: colors.dangerSurface,
    border: colors.danger,
    color: colors.danger,
    icon: 'alert-circle-outline',
  },
  info: {
    background: colors.iconBlueBackground,
    border: colors.primary,
    color: colors.primary,
    icon: 'information-circle-outline',
  },
  success: {
    background: colors.successBackground,
    border: colors.success,
    color: colors.success,
    icon: 'checkmark-circle-outline',
  },
  warning: {
    background: colors.iconOrangeBackground,
    border: colors.warning,
    color: colors.warning,
    icon: 'warning-outline',
  },
};

export function AppToast({ message, tone = 'danger' }: AppToastProps): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const config = toneConfig[tone];

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.toast, { backgroundColor: config.background, borderColor: config.border }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <AppText variant="caption" color={config.color} style={styles.text}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  toast: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    maxWidth: 420,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    width: '100%',
  },
  wrap: {
    left: spacing.xl,
    position: 'absolute',
    right: spacing.xl,
    top: spacing.lg,
    zIndex: 50,
  },
});
