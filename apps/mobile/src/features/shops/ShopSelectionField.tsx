import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Shop } from '@/api/types';
import { colors, radius, spacing } from '@/theme';
import { AppText, FieldLabel } from '@/ui';

type ShopSelectionFieldProps = {
  onPress: () => void;
  primaryShopId?: string;
  required?: boolean;
  selectedShops: Shop[];
};

export function ShopSelectionField({
  onPress,
  primaryShopId,
  required = false,
  selectedShops,
}: ShopSelectionFieldProps): React.ReactElement {
  const primaryShop = selectedShops.find((shop) => shop.id === primaryShopId);

  return (
    <View>
      <FieldLabel label="Магазины" required={required} />
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.field}
      >
        <View style={styles.icon}>
          <Ionicons name="storefront-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <AppText variant="body">
            {selectedShops.length > 0
              ? `Выбрано магазинов: ${selectedShops.length}`
              : 'Выберите магазины'}
          </AppText>
          {primaryShop ? (
            <AppText variant="caption" muted numberOfLines={1} style={styles.primary}>
              Основной: {primaryShop.name}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  primary: {
    marginTop: spacing.xs,
  },
});
