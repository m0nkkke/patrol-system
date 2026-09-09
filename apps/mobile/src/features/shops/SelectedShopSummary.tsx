import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useAssignedMobileShops } from '@/features/shops/queries';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
import { AppText, Card, EntityIcon } from '@/ui';

type SelectedShopSummaryProps = {
  onChange?: () => void;
  shopId: string | null;
};

export function SelectedShopSummary({
  onChange,
  shopId,
}: SelectedShopSummaryProps): React.ReactElement {
  const shops = useAssignedMobileShops(shopId !== null);
  const sessionUser = useAuthStore((state) => state.user);
  const sessionShops = sessionUser?.shops ?? (sessionUser?.shop ? [sessionUser.shop] : []);
  const shop =
    shops.data?.find((item) => item.id === shopId) ??
    sessionShops.find((item) => item.id === shopId);

  return (
    <Card style={styles.card}>
      <EntityIcon icon="storefront-outline" size="small" tone={shopId ? 'primary' : 'warning'} />
      <View style={styles.copy}>
        <AppText variant="caption" muted>
          Выбранный магазин
        </AppText>
        {shops.isPending && shopId && !shop ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />
        ) : (
          <>
            <AppText variant="label" style={styles.name} numberOfLines={2}>
              {shop?.name ?? (shopId ? 'Не удалось загрузить магазин' : 'Магазин не выбран')}
            </AppText>
            {shop?.address ? (
              <AppText variant="caption" muted style={styles.address} numberOfLines={2}>
                {shop.address}
              </AppText>
            ) : null}
          </>
        )}
      </View>
      {onChange ? (
        <TouchableOpacity
          accessibilityLabel="Сменить магазин"
          accessibilityRole="button"
          activeOpacity={0.7}
          hitSlop={8}
          onPress={onChange}
          style={styles.action}
        >
          <Ionicons name="swap-horizontal-outline" size={21} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: spacing.md,
  },
  copy: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  loading: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  name: {
    marginTop: spacing.xs,
  },
  address: {
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
