import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '@patrol/shared';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

import { ROLE_ICONS, roleLabel } from './role';

export function RoleBadge({ role }: { role: UserRole }): React.ReactElement {
  return (
    <View style={styles.badge}>
      <Ionicons name={ROLE_ICONS[role]} size={14} color={colors.primary} />
      <AppText variant="caption" color={colors.primary} style={styles.label}>
        {roleLabel(role)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.chipBackground,
    borderRadius: radius.sm,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
});
