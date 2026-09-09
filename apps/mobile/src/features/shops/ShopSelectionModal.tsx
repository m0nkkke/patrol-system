import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { useInfiniteShops } from '@/features/route-setup/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useNetworkStatus } from '@/lib/use-network-status';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  Button,
  CompactTextIcon,
  ListFooter,
  SegmentedControl,
  SearchField,
  Select,
  SubmitButton,
} from '@/ui';

import { orderPrimaryShop, toggleShopSelection } from './shop-selection';

type SelectionTab = 'all' | 'selected';

export type ShopSelectionResult = {
  primaryShopId?: string;
  shops: Shop[];
};

type ShopSelectionModalProps = {
  applyLabel?: string;
  applying?: boolean;
  errorMessage?: string;
  onApply: (result: ShopSelectionResult) => void;
  onClose: () => void;
  presentation?: 'modal' | 'screen';
  primaryShopId?: string;
  required?: boolean;
  selectedShops: Shop[];
  visible: boolean;
};

export function ShopSelectionModal({
  applyLabel = 'Применить',
  applying = false,
  errorMessage,
  onApply,
  onClose,
  presentation = 'modal',
  primaryShopId,
  required = false,
  selectedShops,
  visible,
}: ShopSelectionModalProps): React.ReactElement {
  const [tab, setTab] = useState<SelectionTab>('all');
  const [search, setSearch] = useState('');
  const [draftShops, setDraftShops] = useState<Shop[]>(selectedShops);
  const [draftPrimaryId, setDraftPrimaryId] = useState<string | undefined>(primaryShopId);
  const debouncedSearch = useDebouncedValue(search);
  const networkStatus = useNetworkStatus();

  const {
    items,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteShops({
    search: tab === 'all' ? debouncedSearch : undefined,
    isActive: true,
    sort: 'name:asc',
  });

  useEffect(() => {
    if (!visible) {
      return;
    }
    setDraftShops(selectedShops);
    setDraftPrimaryId(primaryShopId ?? selectedShops[0]?.id);
    setSearch('');
    setTab('all');
  }, [primaryShopId, selectedShops, visible]);

  const selectedItems = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) {
      return draftShops;
    }
    return draftShops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(query) ||
        shop.externalId?.toLowerCase().includes(query),
    );
  }, [debouncedSearch, draftShops]);

  const data = tab === 'all' ? items : selectedItems;
  const selectedIds = useMemo(() => new Set(draftShops.map((shop) => shop.id)), [draftShops]);
  const primaryOptions = useMemo(
    () =>
      draftShops.map((shop) => ({
        value: shop.id,
        label: shop.name,
        detail: shop.externalId,
        detailIconText: shop.externalId ? 'ID' : undefined,
        hint: shop.address,
      })),
    [draftShops],
  );

  function toggleShop(shop: Shop): void {
    const next = toggleShopSelection(
      { shops: draftShops, primaryShopId: draftPrimaryId },
      shop,
    );
    setDraftShops(next.shops);
    setDraftPrimaryId(next.primaryShopId);
  }

  function applySelection(): void {
    if (applying) {
      return;
    }
    const orderedShops = orderPrimaryShop({
      shops: draftShops,
      primaryShopId: draftPrimaryId,
    });
    onApply({ shops: orderedShops, primaryShopId: draftPrimaryId });
  }

  const tabs = [
    { value: 'all' as const, label: 'Все' },
    { value: 'selected' as const, label: `Выбранные (${draftShops.length})` },
  ];

  const content = (
    <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Закрыть выбор магазинов"
            accessibilityRole="button"
            activeOpacity={0.7}
            hitSlop={10}
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <AppText variant="heading" numberOfLines={1} style={styles.title}>
            Выбор магазинов
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.controls}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Поиск по названию или ID магазина"
          />
          <View style={styles.tabs}>
            <SegmentedControl options={tabs} value={tab} onChange={setTab} />
          </View>
          {draftShops.length > 0 ? (
            <View style={styles.primarySelect}>
              <Select
                label="Основной магазин"
                required
                icon="storefront-outline"
                value={draftPrimaryId ?? null}
                placeholder="Выберите основной магазин"
                title="Основной магазин"
                options={primaryOptions}
                onChange={setDraftPrimaryId}
                searchable={draftShops.length > 8}
              />
            </View>
          ) : null}
        </View>

        {tab === 'all' && isPending ? (
          <View style={styles.center}>
            {networkStatus === 'offline' ? (
              <>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.warning} />
                <AppText muted style={styles.centerText}>
                  Нет сети и сохранённого списка магазинов.
                </AppText>
              </>
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>
        ) : tab === 'all' && isError && items.length === 0 ? (
          <View style={styles.center}>
            <AppText muted style={styles.centerText}>
              {describeError(error)}
            </AppText>
            <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(shop) => shop.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (tab === 'all' && hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
              }
            }}
            ListFooterComponent={
              tab === 'all' ? <ListFooter loading={isFetchingNextPage} /> : null
            }
            ListEmptyComponent={
              <AppText variant="caption" muted style={styles.empty}>
                {tab === 'selected' ? 'Магазины пока не выбраны.' : 'Магазины не найдены.'}
              </AppText>
            }
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              const primary = item.id === draftPrimaryId;

              return (
                <View style={styles.shopRow}>
                  <TouchableOpacity
                    accessibilityLabel={
                      selected ? `Убрать магазин ${item.name}` : `Выбрать магазин ${item.name}`
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    activeOpacity={0.7}
                    hitSlop={4}
                    onPress={() => toggleShop(item)}
                    style={styles.selectionControl}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                  <View style={styles.shopContent}>
                    <AppText variant="label" numberOfLines={2}>
                      {item.name}
                    </AppText>
                    {item.externalId ? (
                      <View style={styles.shopId}>
                        <CompactTextIcon label="ID" />
                        <AppText variant="caption" muted style={styles.shopIdText}>
                          {item.externalId}
                        </AppText>
                      </View>
                    ) : null}
                    {item.address ? (
                      <AppText variant="caption" muted numberOfLines={2} style={styles.address}>
                        {item.address}
                      </AppText>
                    ) : null}
                    {primary ? (
                      <View style={styles.primaryIndicator}>
                        <Ionicons name="star" size={17} color={colors.warning} />
                        <AppText
                          variant="caption"
                          color={colors.warning}
                          style={styles.primaryText}
                        >
                          Основной магазин
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          {errorMessage ? (
            <AppText variant="caption" color={colors.danger} style={styles.footerError}>
              {errorMessage}
            </AppText>
          ) : null}
          <View style={styles.summary}>
            <AppText variant="label">Выбрано: {draftShops.length}</AppText>
          </View>
          <SubmitButton
            label={applyLabel}
            onPress={applySelection}
            loading={applying}
            disabled={(required && (draftShops.length === 0 || !draftPrimaryId)) || applying}
          />
        </View>
    </SafeAreaView>
  );

  if (presentation === 'screen') {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  tabs: {
    marginTop: spacing.md,
  },
  primarySelect: {
    marginTop: spacing.md,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  centerText: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  empty: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  shopRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 82,
    padding: spacing.md,
  },
  shopContent: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  selectionControl: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  shopId: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  shopIdText: {
    marginLeft: spacing.xs,
  },
  address: {
    marginTop: spacing.xs,
  },
  primaryIndicator: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  primaryText: {
    marginLeft: spacing.xs,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerError: {
    marginBottom: spacing.sm,
  },
  summary: {
    marginBottom: spacing.md,
  },
});
