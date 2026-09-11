import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useGuardedPress } from '@/lib/use-guarded-press';
import { colors, layout, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

function contentColorFor(variant: ButtonVariant): string {
  if (variant === 'secondary') {
    return colors.primary;
  }
  if (variant === 'dangerOutline') {
    return colors.danger;
  }
  if (variant === 'ghost') {
    return colors.text;
  }
  return colors.textInverse;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;
  const contentColor = contentColorFor(variant);
  const guardedOnPress = useGuardedPress(onPress);

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      onPress={guardedOnPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={20} color={contentColor} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  icon: {
    marginRight: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dangerOutline: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
});
