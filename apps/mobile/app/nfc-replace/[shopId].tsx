import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { RoutePoint } from '@/api/types';
import { useShopPoints } from '@/features/nfc-replace/queries';
import { colors, radius, spacing } from '@/theme';
import { AppText, Button, Header, Screen } from '@/ui';

export default function NfcReplacePointListScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data: points, isPending, isError, error, refetch, isRefetching } = useShopPoints(shopId);

  function openPoint(point: RoutePoint): void {
    router.push({
      pathname: '/nfc-replace/point/[id]',
      params: {
        id: point.id,
        shopId,
        name: point.name,
      },
    });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Выберите точку"
          subtitle="Точка маршрута, у которой меняете метку"
          onBack={() => router.back()}
        />
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={(points ?? [])
            .filter((point) => point.nfcTag)
            .sort((a, b) => a.sortOrder - b.sortOrder)}
          keyExtractor={(point) => point.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <AppText muted>В этом магазине нет точек с привязанной меткой.</AppText>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openPoint(item)}
              activeOpacity={0.7}
            >
              <View style={styles.info}>
                <AppText variant="label">
                  {item.sortOrder}. {item.name.trim().length > 0 ? item.name : 'Без названия'}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
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
});
