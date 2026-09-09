import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { ShopCard } from '@/features/shops/ShopCard';
import { useAssignedMobileShops } from '@/features/shops/queries';
import { useActivePatrol } from '@/features/patrol/queries';
import { useAuthStore } from '@/store/auth-store';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  Button,
  DataStatusBar,
  EmptyState,
  Header,
  Screen,
  SearchField,
  SectionHeading,
} from '@/ui';

export default function SelectShopScreen(): React.ReactElement {
  const router = useRouter();
  const shops = useAssignedMobileShops();
  const activePatrol = useActivePatrol();
  const selectShop = useAuthStore((state) => state.selectShop);
  const selectedShopId = useAuthStore((state) => state.selectedShopId);
  const sessionUser = useAuthStore((state) => state.user);
  const [switchBlocked, setSwitchBlocked] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const activeShopId = activePatrol.data?.shopId;
    if (!activeShopId || selectedShopId !== null) {
      return;
    }
    void selectShop(activeShopId)
      .then(() => router.replace('/patrol'))
      .catch(() => undefined);
  }, [activePatrol.data?.shopId, router, selectShop, selectedShopId]);

  async function handleSelect(shop: Shop): Promise<void> {
    const activeShopId = activePatrol.data?.shopId;
    if (activeShopId && shop.id !== activeShopId) {
      setSwitchBlocked(true);
      return;
    }
    const isSwitchingShop = selectedShopId !== null;
    await selectShop(shop.id);
    if (isSwitchingShop && router.canGoBack()) {
      router.back();
    } else {
      router.dismissTo('/');
    }
  }

  async function openActivePatrol(): Promise<void> {
    const activeShopId = activePatrol.data?.shopId;
    if (!activeShopId) {
      setSwitchBlocked(false);
      return;
    }
    await selectShop(activeShopId);
    setSwitchBlocked(false);
    router.dismissTo('/patrol');
  }

  const sessionShops = sessionUser?.shops ?? (sessionUser?.shop ? [sessionUser.shop] : []);
  const availableShops = shops.data ?? sessionShops;
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU');
  const filteredShops = availableShops.filter((shop) => {
    if (!normalizedSearch) {
      return true;
    }
    return [shop.name, shop.address, shop.externalId]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('ru-RU').includes(normalizedSearch));
  });

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="Выберите магазин"
          subtitle="Обходы и маршрут будут показаны для выбранного магазина"
          onBack={selectedShopId ? () => router.back() : undefined}
          right={selectedShopId ? undefined : <View />}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию, адресу или ID"
        />
      </View>

      {(shops.isPending && availableShops.length === 0) || activePatrol.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : shops.isError && availableShops.length === 0 ? (
        <View style={styles.center}>
          <AppText muted style={styles.error}>
            {describeError(shops.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void shops.refetch()} />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          <SectionHeading
            title="Доступные магазины"
            subtitle={`Назначено: ${availableShops.length}`}
          />
          {filteredShops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              selected={shop.id === selectedShopId}
              showStatus={false}
              onPress={(selected) => void handleSelect(selected)}
            />
          ))}
          {filteredShops.length === 0 ? (
            <EmptyState
              icon={availableShops.length === 0 ? 'storefront-outline' : 'search-outline'}
              title={availableShops.length === 0 ? 'Нет доступных магазинов' : 'Ничего не найдено'}
              description={
                availableShops.length === 0
                  ? 'Обратитесь к администратору, чтобы получить доступ к магазину.'
                  : 'Попробуйте изменить поисковый запрос.'
              }
            />
          ) : null}
        </ScrollView>
      )}

      {availableShops.length > 0 || (!shops.isPending && !shops.isError) ? (
        <View style={styles.footer}>
          <DataStatusBar
            hasRefreshError={shops.isRefetchError}
            isRefreshing={shops.isRefetching}
            onRefresh={() => void shops.refetch()}
            updatedAt={shops.dataUpdatedAt}
          />
        </View>
      ) : null}

      <AppDialog
        visible={switchBlocked}
        title="Смена магазина недоступна"
        message="Сначала завершите или отмените текущий обход. Во время активного обхода перейти в другой магазин нельзя."
        tone="warning"
        actions={[
          { label: 'Перейти к обходу', onPress: () => void openActivePatrol() },
          {
            label: 'Остаться',
            onPress: () => setSwitchBlocked(false),
            variant: 'ghost',
          },
        ]}
        onClose={() => setSwitchBlocked(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenInsets.horizontal,
  },
  error: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    paddingBottom: screenInsets.listBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.listTop,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: screenInsets.footerBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.footerTop,
  },
});
