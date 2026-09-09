import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  compact?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: BadgeTone;
};

const TONES: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: colors.border, text: colors.textMuted },
  success: { background: '#dcfce7', text: colors.success },
  warning: { background: '#fef3c7', text: colors.warning },
  danger: { background: colors.dangerSurface, text: colors.danger },
};

export function Badge({
  compact = false,
  icon,
  label,
  tone = 'neutral',
}: BadgeProps): React.ReactElement {
  const palette = TONES[tone];
  return (
    <View
      style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: palette.background }]}
    >
      {icon ? (
        <Ionicons name={icon} size={compact ? 11 : 13} color={palette.text} style={styles.icon} />
      ) : null}
      <AppText variant="caption" color={palette.text} style={compact ? styles.labelCompact : undefined}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  badgeCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  labelCompact: {
    fontSize: 13,
  },
});
