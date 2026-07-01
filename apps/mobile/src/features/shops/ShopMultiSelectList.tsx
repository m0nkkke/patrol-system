import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useInfiniteShops, useShopsByIds } from '@/features/route-setup/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { colors, radius, spacing } from '@/theme';
import { AppText, ListFooter, TextField } from '@/ui';

type ShopMultiSelectListProps = {
  selectedIds: string[];
  onToggle: (shopId: string) => void;
  onSetPrimary: (shopId: string) => void;
};

export function ShopMultiSelectList({
  selectedIds,
  onToggle,
  onSetPrimary,
}: ShopMultiSelectListProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const primaryId = selectedIds[0];

  const { items, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteShops({
    search: debouncedSearch,
    isActive: true,
    sort: 'name:asc',
  });

  const selectedShops = useShopsByIds(selectedIds);
  const isSearching = debouncedSearch.trim().length > 0;
  const data = isSearching
    ? items
    : [...selectedShops, ...items.filter((shop) => !selectedIds.includes(shop.id))];

  return (
    <View style={styles.container}>
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Поиск магазина"
        icon="search"
        tone="control"
      />
      <FlatList
        style={styles.list}
        data={data}
        keyExtractor={(shop) => shop.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        ListFooterComponent={<ListFooter loading={isFetchingNextPage} />}
        ListEmptyComponent={
          <AppText variant="caption" muted style={styles.empty}>
            {isPending ? 'Загрузка магазинов…' : 'Магазины не найдены.'}
          </AppText>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          const isPrimary = item.id === primaryId;
          return (
            <TouchableOpacity
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onToggle(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={22}
                color={selected ? colors.primary : colors.textMuted}
              />
              <View style={styles.nameWrap}>
                <AppText variant="label" numberOfLines={1}>
                  {item.name}
                </AppText>
                {item.address ? (
                  <AppText variant="caption" muted numberOfLines={1} style={styles.address}>
                    {item.address}
                  </AppText>
                ) : null}
                {isPrimary ? (
                  <AppText variant="caption" color={colors.primary} style={styles.primaryHint}>
                    Основной магазин
                  </AppText>
                ) : null}
              </View>
              {selected ? (
                <TouchableOpacity onPress={() => onSetPrimary(item.id)} hitSlop={10}>
                  <Ionicons
                    name={isPrimary ? 'star' : 'star-outline'}
                    size={22}
                    color={isPrimary ? colors.warning : colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    marginTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  empty: {
    marginTop: spacing.md,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  rowSelected: {
    borderColor: colors.primary,
  },
  nameWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  address: {
    marginTop: spacing.xs,
  },
  primaryHint: {
    marginTop: spacing.xs,
  },
});
