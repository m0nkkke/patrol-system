import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { AdminUser } from '@/api/types';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

import { RoleBadge } from './RoleBadge';

type UserCardProps = {
  user: AdminUser;
  onPress: () => void;
};

export function UserCard({ user, onPress }: UserCardProps): React.ReactElement {
  const inactive = !user.isActive;

  return (
    <TouchableOpacity
      style={[styles.card, inactive && styles.cardInactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <AppText variant="label" color={inactive ? colors.textMuted : colors.text}>
          {user.fullName}
        </AppText>
        <View style={styles.roleRow}>
          <RoleBadge role={user.role} />
        </View>
        {inactive ? (
          <AppText variant="caption" color={colors.danger} style={styles.status}>
            Неактивен
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  info: {
    flex: 1,
    marginRight: spacing.lg,
  },
  roleRow: {
    marginTop: spacing.xs,
  },
  status: {
    marginTop: spacing.xs,
  },
});
