import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export type StatusLabelTone = 'success' | 'danger' | 'warning' | 'neutral';

const TONES: Record<StatusLabelTone, string> = {
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  neutral: colors.textMuted,
};

type StatusLabelProps = {
  label: string;
  tone?: StatusLabelTone;
};

export function StatusLabel({ label, tone = 'neutral' }: StatusLabelProps): React.ReactElement {
  const color = TONES[tone];

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color={color} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: spacing.xs,
    width: 8,
  },
  label: {
    fontWeight: '600',
  },
});
