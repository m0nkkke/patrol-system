import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Shop } from '@/api/types';
import { useShops } from '@/features/route-setup/queries';
import { colors, radius, spacing } from '@/theme';
import { AppText, TextField } from '@/ui';

type ShopSelectListProps = {
  selectedId: string | null;
  onSelect: (shopId: string) => void;
};

export function ShopSelectList({ selectedId, onSelect }: ShopSelectListProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const { data: shops, isPending } = useShops();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = shops ?? [];
    const matched = query
      ? list.filter(
          (shop: Shop) =>
            shop.name.toLowerCase().includes(query) ||
            (shop.externalId?.toLowerCase().includes(query) ?? false),
        )
      : list;
    return [...matched].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [shops, search]);

  return (
    <View style={styles.container}>
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Поиск магазина"
        icon="search"
      />
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(shop) => shop.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <AppText variant="caption" muted style={styles.empty}>
            {isPending ? 'Загрузка магазинов…' : 'Магазины не найдены.'}
          </AppText>
        }
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <TouchableOpacity
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
            >
              <AppText variant="body" style={styles.name} numberOfLines={1}>
                {item.name}
              </AppText>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={selected ? colors.primary : colors.textMuted}
              />
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
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  rowSelected: {
    borderColor: colors.primary,
  },
  name: {
    flex: 1,
    marginRight: spacing.md,
  },
});
