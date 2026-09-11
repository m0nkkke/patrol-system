import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useGuardedPress } from '@/lib/use-guarded-press';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { CompactTextIcon } from './CompactTextIcon';

type DetailRowProps = {
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  first?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconText?: string;
  onAction?: () => void;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

export function DetailRow({
  actionIcon,
  actionLabel,
  first = false,
  icon,
  iconText,
  onAction,
  trailingIcon,
  label,
  value,
}: DetailRowProps): React.ReactElement {
  const guardedOnAction = useGuardedPress(onAction);

  return (
    <View style={[styles.row, first && styles.first]}>
      <View style={styles.leading}>
        {iconText ? (
          <CompactTextIcon label={iconText} />
        ) : icon ? (
          <Ionicons name={icon} size={22} color={colors.textMuted} />
        ) : null}
      </View>
      <View style={styles.content}>
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="body" selectable numberOfLines={4} style={styles.value}>
          {value}
        </AppText>
      </View>
      {onAction && actionIcon ? (
        <TouchableOpacity
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          activeOpacity={0.7}
          hitSlop={8}
          onPress={guardedOnAction}
          style={styles.action}
        >
          <Ionicons name={actionIcon} size={21} color={colors.primary} />
        </TouchableOpacity>
      ) : trailingIcon ? (
        <View style={styles.action}>
          <Ionicons name={trailingIcon} size={21} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 78,
    paddingVertical: spacing.md,
  },
  first: {
    borderTopWidth: 0,
  },
  leading: {
    alignItems: 'center',
    width: 40,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    marginTop: spacing.xs,
  },
  action: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 40,
  },
});
