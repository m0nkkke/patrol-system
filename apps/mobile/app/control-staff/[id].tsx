import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useControlStaffMember } from '@/features/control-staff/use-control-staff';
import { roleLabel } from '@/features/users/role';
import { colors, screenInsets, spacing } from '@/theme';
import { AppText, AsyncStateScreen, Badge, Button, Card, Header, InfoRow, Screen } from '@/ui';

export default function ControlStaffDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const staff = useControlStaffMember(id);
  const member = staff.data;

  if (staff.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }
  if (staff.isError || !member) {
    return (
      <AsyncStateScreen
        message={describeError(staff.error)}
        onBack={() => router.back()}
        onRetry={() => void staff.refetch()}
      />
    );
  }
  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={staff.isRefetching}
            onRefresh={() => void staff.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Header title={member.fullName} subtitle={roleLabel(member.role)} onBack={() => router.back()} />

        <Card>
          <InfoRow label="Статус" value={member.isActive ? 'Активен' : 'Неактивен'} first />
          <InfoRow label="Роль" value={roleLabel(member.role)} />
          <InfoRow label="Назначено магазинов" value={String(member.shops.length)} />
        </Card>

        <View style={styles.historyAction}>
          <Button
            label="История обходов сотрудника"
            variant="secondary"
            icon="document-text-outline"
            onPress={() =>
              router.push({
                pathname: '/control-patrols',
                params: { employeeId: member.id, employeeName: member.fullName },
              })
            }
          />
        </View>

        <AppText variant="label" style={styles.sectionTitle}>Назначения</AppText>
        {member.shops.map((shop) => (
          <Card
            key={shop.id}
            style={styles.shopCard}
            onPress={() =>
              router.push({ pathname: '/control-shops/[id]', params: { id: shop.id } })
            }
          >
            <View style={styles.row}>
              <View style={styles.shopIcon}>
                <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.content}>
                <AppText variant="label">{shop.name}</AppText>
                {shop.address ? (
                  <AppText variant="caption" muted style={styles.meta}>{shop.address}</AppText>
                ) : null}
                {shop.id === member.primaryShopId ? (
                  <View style={styles.badge}>
                    <Badge label="Основной магазин" tone="success" />
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  errorText: { marginBottom: spacing.lg, textAlign: 'center' },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.xl },
  historyAction: { marginTop: spacing.lg },
  shopCard: { marginBottom: spacing.sm, padding: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row' },
  shopIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  content: { flex: 1, marginRight: spacing.sm },
  meta: { marginTop: spacing.xs },
  badge: { marginTop: spacing.sm },
});
