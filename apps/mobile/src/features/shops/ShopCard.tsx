import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Shop } from '@/api/types';
import { routeStatusColor, routeStatusLabel } from '@/features/route-setup/route-status';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

type ShopCardProps = {
  shop: Shop;
  onPress: (shop: Shop) => void;
  showPoints?: boolean;
  showStatus?: boolean;
  showActive?: boolean;
};

function ShopCardComponent({
  shop,
  onPress,
  showPoints = false,
  showStatus = true,
  showActive = false,
}: ShopCardProps): React.ReactElement {
  const statusColor = routeStatusColor(shop.routeStatus);
  const inactive = showActive && !shop.isActive;
  const activeColor = shop.isActive ? colors.success : colors.danger;

  return (
    <TouchableOpacity
      style={[styles.card, inactive && styles.cardInactive]}
      onPress={() => onPress(shop)}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <AppText variant="label" color={inactive ? colors.textMuted : colors.text}>
          {shop.name}
        </AppText>
        {shop.address ? (
          <AppText variant="caption" muted style={styles.meta}>
            {shop.address}
          </AppText>
        ) : null}
        {showPoints ? (
          <AppText variant="caption" muted style={styles.meta}>
            Точек: {shop.routeRegisteredPoints} из {shop.routeExpectedPoints}
          </AppText>
        ) : null}
      </View>

      <View style={styles.right}>
        {showActive ? (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: activeColor }]} />
            <AppText variant="caption" color={activeColor} style={styles.statusText}>
              {shop.isActive ? 'Активен' : 'Неактивен'}
            </AppText>
          </View>
        ) : null}
        {showStatus ? (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <AppText variant="caption" color={statusColor} style={styles.statusText}>
              {routeStatusLabel(shop.routeStatus)}
            </AppText>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export const ShopCard = memo(ShopCardComponent);

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
  meta: {
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
