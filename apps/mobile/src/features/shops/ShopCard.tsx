import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Shop } from '@/api/types';
import { routeStatusLabel, routeStatusTone } from '@/features/route-setup/route-status';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge } from '@/ui';

type ShopCardProps = {
  shop: Shop;
  onPress: () => void;
  showPoints?: boolean;
};

export function ShopCard({ shop, onPress, showPoints = false }: ShopCardProps): React.ReactElement {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <AppText variant="label">{shop.name}</AppText>
        
        {shop.externalId ? (
          <AppText variant="label" muted style={styles.meta}>
            ID: {shop.externalId}
          </AppText>
        ) : null}
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
        <View style={styles.statusRow}>
          <Badge label={routeStatusLabel(shop.routeStatus)} tone={routeStatusTone(shop.routeStatus)} />
        </View>
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
  info: {
    flex: 1,
    marginRight: spacing.lg,
  },
  statusRow: {
    marginTop: spacing.xs,
  },
  meta: {
    marginTop: spacing.xs,
  },
});
