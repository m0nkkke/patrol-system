import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { ShopMultiSelectList } from '@/features/shops/ShopMultiSelectList';
import { useAssignUserShops, useUser } from '@/features/users/queries';
import { colors, spacing } from '@/theme';
import { AppText, Button, FormHeader, Header, Screen } from '@/ui';

export default function EditUserShopsScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const assign = useAssignUserShops(id);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!user || seeded) {
      return;
    }
    const ids = user.shopIds ?? (user.shops ?? []).map((shop) => shop.id);
    const primary = user.shopId;
    const ordered = primary ? [primary, ...ids.filter((shopId) => shopId !== primary)] : ids;
    setSelectedIds(ordered);
    setSeeded(true);
  }, [user, seeded]);

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !user) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  function toggleShop(shopId: string): void {
    setSelectedIds((prev) =>
      prev.includes(shopId) ? prev.filter((value) => value !== shopId) : [...prev, shopId],
    );
  }

  function setPrimaryShop(shopId: string): void {
    setSelectedIds((prev) =>
      prev.includes(shopId) ? [shopId, ...prev.filter((value) => value !== shopId)] : prev,
    );
  }

  function handleSave(): void {
    if (selectedIds.length === 0 || assign.isPending) {
      return;
    }
    assign.mutate(
      { shopIds: selectedIds, primaryShopId: selectedIds[0] },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topArea}>
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="storefront"
            title="Магазины пользователя"
            subtitle={user.fullName}
          />
        </View>

        <View style={styles.shopArea}>
          <ShopMultiSelectList
            selectedIds={selectedIds}
            onToggle={toggleShop}
            onSetPrimary={setPrimaryShop}
          />
        </View>

        <View style={styles.footer}>
          {assign.isError ? (
            <AppText variant="caption" color={colors.danger} style={styles.footerError}>
              {describeError(assign.error)}
            </AppText>
          ) : null}
          <Button
            label="Сохранить"
            icon="checkmark-circle-outline"
            onPress={handleSave}
            loading={assign.isPending}
            disabled={selectedIds.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  topArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  shopArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  footerError: {
    marginBottom: spacing.sm,
  },
});
