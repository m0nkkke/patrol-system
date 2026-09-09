import { StyleSheet, Switch, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type StatusToggleCardProps = {
  activeDescription: string;
  activeLabel: string;
  inactiveDescription: string;
  inactiveLabel: string;
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
};

export function StatusToggleCard({
  activeDescription,
  activeLabel,
  inactiveDescription,
  inactiveLabel,
  label,
  onChange,
  value,
}: StatusToggleCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="body" style={styles.statusLabel}>
          {value ? activeLabel : inactiveLabel}
        </AppText>
        <AppText variant="caption" muted style={styles.description}>
          {value ? activeDescription : inactiveDescription}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    marginRight: spacing.lg,
  },
  statusLabel: {
    marginTop: spacing.sm,
  },
  description: {
    marginTop: spacing.xs,
  },
});
