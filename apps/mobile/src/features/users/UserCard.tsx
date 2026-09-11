import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { AdminUser } from '@/api/types';
import { useGuardedPress } from '@/lib/use-guarded-press';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

import { roleLabel } from './role';
import { primaryShopLabel, userInitials } from './user-card-data';

type UserCardProps = {
  user: AdminUser;
  onPress: (user: AdminUser) => void;
};

function UserCardComponent({ user, onPress }: UserCardProps): React.ReactElement {
  const inactive = !user.isActive;
  const statusColor = user.isActive ? colors.success : colors.danger;
  const guardedOnPress = useGuardedPress(() => onPress(user));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={guardedOnPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: inactive ? colors.dangerSurface : colors.iconBlueBackground,
          },
        ]}
      >
        <AppText
          variant="label"
          color={inactive ? colors.danger : colors.iconBlue}
          numberOfLines={1}
        >
          {userInitials(user.fullName)}
        </AppText>
      </View>

      <View style={styles.info}>
        <AppText
          variant="label"
          color={inactive ? colors.textMuted : colors.text}
          numberOfLines={2}
        >
          {user.fullName}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1} style={styles.role}>
          {roleLabel(user.role)}
        </AppText>
        <View style={styles.shopRow}>
          <Ionicons name="storefront-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.shopName}>
            {primaryShopLabel(user)}
          </AppText>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <AppText variant="caption" color={statusColor} numberOfLines={1} style={styles.statusText}>
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
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 108,
    padding: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 48,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
    minWidth: 0,
  },
  role: {
    marginTop: spacing.xs,
  },
  shopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  shopName: {
    flex: 1,
    marginLeft: spacing.sm,
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
