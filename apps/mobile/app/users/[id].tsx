import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { AdminUser } from '@/api/types';
import { useShops } from '@/features/route-setup/queries';
import { useUser } from '@/features/users/queries';
import { RoleBadge } from '@/features/users/RoleBadge';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Header, InfoRow, Screen } from '@/ui';

export default function UserDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const { data: shops } = useShops();

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

  const shopName = user.shopId
    ? ((shops ?? []).find((shop) => shop.id === user.shopId)?.name ?? user.shopId)
    : '—';

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header title="Пользователь" onBack={() => router.back()} />

        <SummaryCard user={user} />

        <Card style={styles.gapLg}>
          <InfoRow label="Магазин" value={shopName} first />
          <InfoRow label="Ключ доступа" value={user.accessKey ?? '—'} selectable />
          <InfoRow label="Последний вход" value={formatDateTime(user.lastLoginAt)} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function SummaryCard({ user }: { user: AdminUser }): React.ReactElement {
  return (
    <Card>
      <View style={styles.summaryRow}>
        <View style={styles.summaryText}>
          <AppText variant="heading">{user.fullName}</AppText>
          <View style={styles.gapSm}>
            <RoleBadge role={user.role} />
          </View>
        </View>
        <Badge
          label={user.isActive ? 'Активен' : 'Неактивен'}
          tone={user.isActive ? 'success' : 'danger'}
        />
      </View>
    </Card>
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
  summaryRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryText: {
    flex: 1,
    marginRight: spacing.md,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
});
