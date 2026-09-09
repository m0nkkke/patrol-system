import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useShop } from '@/features/route-setup/queries';
import { useAssignedMobileShops } from '@/features/shops/queries';
import { roleLabel } from '@/features/users/role';
import { useAuthStore } from '@/store/auth-store';
import { screenInsets, spacing } from '@/theme';
import { AppText, Button, Card, DetailRow, EntityIcon, FormHeader, Header, Screen } from '@/ui';

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const selectedShopId = useAuthStore((state) => state.selectedShopId);
  const signOut = useAuthStore((state) => state.signOut);
  const isSecurityGuard = user?.role === 'security_guard';
  const isUniversalRouteSetter = user?.role === 'route_setter';
  const { data: primaryShop } = useShop(
    isSecurityGuard || isUniversalRouteSetter ? undefined : user?.shopId,
  );
  const { data: assignedShops } = useAssignedMobileShops(isSecurityGuard);
  const sessionShops = user?.shops ?? (user?.shop ? [user.shop] : []);
  const guardShops = assignedShops ?? sessionShops;
  const shop = isSecurityGuard
    ? guardShops.find((item) => item.id === selectedShopId)
    : primaryShop;

  const version = Constants.expoConfig?.version ?? '-';
  const displayName = user?.authorizationFullName ?? user?.fullName ?? 'Пользователь';
  const displayRole = user ? roleLabel(user.role) : '-';

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header compact onBack={() => router.back()} />
        <FormHeader
          icon="person-outline"
          title="Профиль"
          subtitle="Данные текущей учётной записи"
        />

        <Card style={styles.identityCard}>
          <EntityIcon icon="person-outline" size="large" />
          <View style={styles.identityCopy}>
            <AppText variant="label" numberOfLines={2}>
              {displayName}
            </AppText>
            <AppText variant="caption" muted style={styles.identityRole}>
              {displayRole}
            </AppText>
          </View>
        </Card>

        <Card style={styles.detailsCard}>
          <DetailRow
            first
            icon="shield-checkmark-outline"
            label="Роль"
            value={displayRole}
          />
          <DetailRow
            icon={isUniversalRouteSetter ? 'business-outline' : 'storefront-outline'}
            label={
              isSecurityGuard
                ? 'Выбранный магазин'
                : isUniversalRouteSetter
                  ? 'Область работы'
                  : 'Основной магазин'
            }
            value={isUniversalRouteSetter ? 'Все активные магазины' : shop?.name ?? '-'}
          />
          {isSecurityGuard ? (
            <DetailRow
              icon="business-outline"
              label="Назначено магазинов"
              value={String(guardShops.length)}
            />
          ) : null}
          <DetailRow icon="phone-portrait-outline" label="Версия приложения" value={version} />
        </Card>

        {isSecurityGuard && guardShops.length > 1 ? (
          <View style={styles.actionGap}>
            <Button
              label="Сменить магазин"
              variant="secondary"
              icon="swap-horizontal-outline"
              onPress={() => router.push('/select-shop')}
            />
          </View>
        ) : null}

        <View style={styles.actionGap}>
          <Button
            label="Выйти из системы"
            variant="dangerOutline"
            icon="log-out-outline"
            onPress={() => void signOut()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
    paddingBottom: screenInsets.bottom,
  },
  identityCard: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: spacing.lg,
  },
  identityCopy: {
    flex: 1,
    marginLeft: spacing.lg,
    minWidth: 0,
  },
  identityRole: {
    marginTop: spacing.xs,
  },
  detailsCard: {
    marginTop: spacing.md,
    paddingBottom: 0,
    paddingTop: 0,
  },
  actionGap: {
    marginTop: spacing.lg,
  },
});
