import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

const TONES: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: colors.border, text: colors.textMuted },
  success: { background: '#dcfce7', text: colors.success },
  warning: { background: '#fef3c7', text: colors.warning },
  danger: { background: colors.dangerSurface, text: colors.danger },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps): React.ReactElement {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <AppText variant="caption" color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
