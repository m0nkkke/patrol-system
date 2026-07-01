import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { AdminUser } from '@/api/types';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

import { RoleBadge } from './RoleBadge';

type UserCardProps = {
  user: AdminUser;
  onPress: (user: AdminUser) => void;
};

function UserCardComponent({ user, onPress }: UserCardProps): React.ReactElement {
  const inactive = !user.isActive;
  const statusColor = user.isActive ? colors.success : colors.danger;

  return (
    <TouchableOpacity
      style={[styles.card, inactive && styles.cardInactive]}
      onPress={() => onPress(user)}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <AppText variant="label" color={inactive ? colors.textMuted : colors.text}>
          {user.fullName}
        </AppText>
        <View style={styles.roleRow}>
          <RoleBadge role={user.role} />
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <AppText variant="caption" color={statusColor} style={styles.statusText}>
            {user.isActive ? 'Активен' : 'Неактивен'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export const UserCard = memo(UserCardComponent);

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
    marginRight: spacing.md,
  },
  roleRow: {
    marginTop: spacing.xs,
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: spacing.xs,
    width: 8,
  },
  statusText: {
    fontWeight: '600',
  },
});
