import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { useShopPatrols } from '@/features/history/queries';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Header, Screen } from '@/ui';

export default function ShopHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data, isPending, isError, error, refetch } = useShopPatrols(shopId);

  function openPatrol(patrolId: string): void {
    router.push({ pathname: '/history/patrol/[id]', params: { id: patrolId } });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header title="История обходов" onBack={() => router.back()} />
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
          data={data.items}
          keyExtractor={(patrol) => patrol.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<AppText muted>Обходов пока нет.</AppText>}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => openPatrol(item.id)}>
              <View style={styles.cardRow}>
                <View style={styles.info}>
                  <AppText variant="label">{item.employee?.fullName ?? 'Сотрудник'}</AppText>
                  <AppText variant="caption" muted style={styles.meta}>
                    {formatDateTime(item.startedAt)} · {item.scannedPoints} / {item.totalPoints} точек
                  </AppText>
                  <View style={styles.statusRow}>
                    <Badge
                      label={patrolStatusLabel(item.status)}
                      tone={patrolStatusTone(item.status)}
                    />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  meta: {
    marginTop: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.sm,
  },
});
