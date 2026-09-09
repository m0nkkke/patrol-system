import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Shop } from '@/api/types';
import { routeStatusColor, routeStatusLabel } from '@/features/route-setup/route-status';
import { colors, radius, spacing } from '@/theme';
import { AppText, CompactTextIcon } from '@/ui';

type ShopCardProps = {
  shop: Shop;
  onPress: (shop: Shop) => void;
  selected?: boolean;
  showPoints?: boolean;
  showStatus?: boolean;
  showActive?: boolean;
};

function ShopCardComponent({
  shop,
  onPress,
  selected = false,
  showPoints = false,
  showStatus = true,
  showActive = false,
}: ShopCardProps): React.ReactElement {
  const statusColor = routeStatusColor(shop.routeStatus);
  const inactive = showActive && !shop.isActive;
  const activeColor = shop.isActive ? colors.success : colors.danger;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={() => onPress(shop)}
      activeOpacity={0.7}
    >
      <View style={[styles.shopIcon, inactive && styles.shopIconInactive]}>
        <Ionicons
          name="storefront-outline"
          size={22}
          color={inactive ? colors.danger : colors.primary}
        />
      </View>

      <View style={styles.info}>
        <AppText
          variant="label"
          color={inactive ? colors.textMuted : colors.text}
          numberOfLines={2}
        >
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
        <View style={styles.idRow}>
          <CompactTextIcon label="ID" />
          <AppText variant="caption" muted numberOfLines={1} style={styles.idValue}>
            {shop.externalId ?? '—'}
          </AppText>
        </View>
      </View>

      <View style={styles.right}>
        {showActive ? (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: activeColor }]} />
            <AppText
              variant="caption"
              color={activeColor}
              numberOfLines={1}
              style={styles.statusText}
            >
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
        <Ionicons
          name={selected ? 'checkmark-circle' : 'chevron-forward'}
          size={selected ? 22 : 20}
          color={selected ? colors.primary : colors.textMuted}
        />
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
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 108,
    padding: spacing.md,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
    minWidth: 0,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  shopIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  shopIconInactive: {
    backgroundColor: colors.dangerSurface,
  },
  meta: {
    marginTop: spacing.xs,
  },
  idRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  idValue: {
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
