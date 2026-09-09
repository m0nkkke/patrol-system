import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { RoutePoint } from '@/api/types';
import { useShopPoints } from '@/features/nfc-replace/queries';
import { PatrolPointCard } from '@/features/patrol-points/PatrolPointCard';
import { useShop } from '@/features/route-setup/queries';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  DataStatusBar,
  EmptyState,
  Header,
  Screen,
  SearchField,
} from '@/ui';

export default function NfcReplacePointListScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId = '' } = useLocalSearchParams<{ shopId: string }>();
  const [search, setSearch] = useState('');
  const shopQuery = useShop(shopId);
  const pointsQuery = useShopPoints(shopId);

  const points = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return [...(pointsQuery.data ?? [])]
      .filter((point) => {
        const hasNfc = Boolean(point.nfcTagId ?? point.nfcTag?.id);
        const matchesSearch =
          !query ||
          point.name.toLocaleLowerCase('ru-RU').includes(query) ||
          point.description?.toLocaleLowerCase('ru-RU').includes(query);
        return point.isActive && hasNfc && matchesSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'ru-RU'));
  }, [pointsQuery.data, search]);

  const isPending = shopQuery.isPending || pointsQuery.isPending;
  const hasInitialError =
    (shopQuery.isError && shopQuery.data === undefined) ||
    (pointsQuery.isError && pointsQuery.data === undefined);
  const hasRefreshError =
    (shopQuery.isError && shopQuery.data !== undefined) ||
    (pointsQuery.isError && pointsQuery.data !== undefined);
  const isRefreshing = shopQuery.isRefetching || pointsQuery.isRefetching;
  const updatedAt = Math.min(
    shopQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
    pointsQuery.dataUpdatedAt || Number.MAX_SAFE_INTEGER,
  );

  function refresh(): void {
    void shopQuery.refetch();
    void pointsQuery.refetch();
  }

  function openPoint(point: RoutePoint): void {
    router.push({
      pathname: '/nfc-replace/point/[id]',
      params: { id: point.id, shopId, name: point.name },
    });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="Замена NFC-метки"
          subtitle={shopQuery.data?.name ?? 'Выберите контрольную точку'}
          onBack={() => router.back()}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию или описанию точки"
        />
        <AppText variant="caption" muted style={styles.count}>
          Доступно точек: {points.length}
        </AppText>
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hasInitialError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(shopQuery.error ?? pointsQuery.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={refresh} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={points}
          keyExtractor={(point) => point.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="radio-outline"
              title={search ? 'Точки не найдены' : 'Нет точек с NFC-метками'}
              description={
                search
                  ? 'Измените поисковый запрос.'
                  : 'Сначала зарегистрируйте точку и привяжите к ней NFC-метку.'
              }
            />
          }
          renderItem={({ item }) => <PatrolPointCard point={item} onPress={openPoint} />}
        />
      )}

      {!isPending && !hasInitialError ? (
        <View style={styles.footer}>
          <DataStatusBar
            hasRefreshError={hasRefreshError}
            isRefreshing={isRefreshing}
            updatedAt={updatedAt === Number.MAX_SAFE_INTEGER ? 0 : updatedAt}
            onRefresh={refresh}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  count: {
    marginTop: spacing.md,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenInsets.horizontal,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
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
