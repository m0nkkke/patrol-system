import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useShop } from '@/features/route-setup/queries';
import { routeStatusLabel, routeStatusTone } from '@/features/route-setup/route-status';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Header, InfoRow, Screen } from '@/ui';

export default function ShopDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shop, isPending, isError, error, refetch } = useShop(id);

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !shop) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header
          title="Магазин"
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.editAction}
              onPress={() => router.push({ pathname: '/shops/edit/[id]', params: { id: shop.id } })}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <AppText variant="body" color={colors.primary} style={styles.editActionText}>
                Изменить
              </AppText>
            </TouchableOpacity>
          }
        />

        <Card>
          <AppText variant="heading">{shop.name}</AppText>
          <View style={styles.badges}>
            <Badge
              label={shop.isActive ? 'Активен' : 'Неактивен'}
              tone={shop.isActive ? 'success' : 'danger'}
            />
            <Badge label={routeStatusLabel(shop.routeStatus)} tone={routeStatusTone(shop.routeStatus)} />
          </View>
        </Card>

        <Card style={styles.gapLg}>
          <InfoRow label="ID магазина" value={shop.externalId ?? '—'} first />
          <InfoRow label="Адрес" value={shop.address ?? '—'} />
          <InfoRow label="Часовой пояс" value={shop.timezone} />
          <InfoRow
            label="Точки маршрута"
            value={`${shop.routeRegisteredPoints} / ${shop.routeExpectedPoints}`}
          />
        </Card>

        <View style={styles.gapLg}>
          <Button
            label="История обходов"
            variant="secondary"
            icon="document-text-outline"
            onPress={() =>
              router.push({ pathname: '/history/[shopId]', params: { shopId: shop.id } })
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  editAction: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  editActionText: {
    marginLeft: spacing.xs,
  },
  badges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
});
