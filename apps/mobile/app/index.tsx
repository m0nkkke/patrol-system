import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { PatrolHomeWidget } from '@/features/patrol/PatrolHomeWidget';
import { useShop } from '@/features/route-setup/queries';
import { roleLabel } from '@/features/users/role';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
import { AppText, Card, MenuItem, Screen } from '@/ui';

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const hasAccess = isAdmin || isManager || isEmployee;

  function openHistory(): void {
    if (user?.shopId) {
      router.push({ pathname: '/history/[shopId]', params: { shopId: user.shopId } });
    } else {
      router.push('/history');
    }
  }

  function openSchedules(): void {
    if (user?.shopId) {
      router.push({ pathname: '/schedules/[shopId]', params: { shopId: user.shopId } });
    } else {
      router.push('/schedules/shops');
    }
  }

  function openRouteSetup(): void {
    if (user?.shopId) {
      router.push({ pathname: '/route-setup/[shopId]', params: { shopId: user.shopId } });
    } else {
      router.push('/route-setup/shops');
    }
  }

  function openNfcReplace(): void {
    if (user?.shopId) {
      router.push({ pathname: '/nfc-replace/[shopId]', params: { shopId: user.shopId } });
    } else {
      router.push('/nfc-replace/shops');
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.profile}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
        >
          <View style={styles.profileText}>
            <AppText variant="caption" muted>
              Добрый день,
            </AppText>
            <AppText variant="heading">{user?.fullName ?? ''}</AppText>
            {role ? (
              <AppText variant="caption" color={colors.roleText} style={styles.chipText}>
                {roleLabel(role)}
              </AppText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {(isManager || isEmployee) && user?.shopId ? (
          <PrimaryShopCard shopId={user.shopId} />
        ) : null}

        {isAdmin ? (
          <View>
            <SectionLabel title="Управление" />
            <MenuItem
              icon="business-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Новый магазин"
              subtitle="Регистрация торговой точки"
              onPress={() => router.push('/shops/new')}
            />
            <MenuItem
              icon="person-add-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Новый пользователь"
              subtitle="Создать сотрудника, выдать ключ"
              onPress={() => router.push('/users/new')}
            />
            <MenuItem
              icon="storefront-outline"
              iconColor={colors.iconSlate}
              iconBackground={colors.iconSlateBackground}
              title="Магазины"
              subtitle="Список магазинов и редактирование"
              onPress={() => router.push('/shops')}
            />
            <MenuItem
              icon="people-outline"
              iconColor={colors.iconSlate}
              iconBackground={colors.iconSlateBackground}
              title="Пользователи"
              subtitle="Список сотрудников и их данные"
              onPress={() => router.push('/users')}
            />
            <MenuItem
              icon="git-network-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Маршруты"
              subtitle="Настройка точек и NFC-меток"
              onPress={openRouteSetup}
            />
            <MenuItem
              icon="swap-horizontal-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Замена NFC-метки"
              subtitle="Перепривязать метку у точки"
              onPress={openNfcReplace}
            />
            <MenuItem
              icon="calendar-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Расписания"
              subtitle="График обходов по магазинам"
              onPress={openSchedules}
            />

            <SectionLabel title="Контроль обходов" />
            <MenuItem
              icon="document-text-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="История обходов"
              subtitle="По магазинам или сотрудникам"
              onPress={openHistory}
            />
            <MenuItem
              icon="warning-outline"
              iconColor={colors.danger}
              iconBackground={colors.dangerSurface}
              title="Нарушения"
              subtitle="Подозрительные обходы по всем магазинам"
              onPress={() => router.push('/incidents')}
            />
          </View>
        ) : null}

        {isManager ? (
          <View>
            <SectionLabel title="Управление" />
            <MenuItem
              icon="git-network-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Маршруты"
              subtitle="Настройка маршрута вашего магазина"
              onPress={openRouteSetup}
            />
            <MenuItem
              icon="swap-horizontal-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Замена NFC-метки"
              subtitle="Замена метки в вашем магазине"
              onPress={openNfcReplace}
            />
            <MenuItem
              icon="calendar-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Расписания"
              subtitle="График обходов вашего магазина"
              onPress={openSchedules}
            />

            <SectionLabel title="Контроль обходов" />
            <MenuItem
              icon="document-text-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="История обходов"
              subtitle="Обходы вашего магазина"
              onPress={openHistory}
            />
            <MenuItem
              icon="warning-outline"
              iconColor={colors.danger}
              iconBackground={colors.dangerSurface}
              title="Нарушения"
              subtitle="Подозрительные обходы вашего магазина"
              onPress={() => router.push('/incidents')}
            />
          </View>
        ) : null}

        {isEmployee ? (
          <View>
            <SectionLabel title="Обход" />
            <PatrolHomeWidget />
          </View>
        ) : null}

        {!hasAccess ? (
          <AppText muted style={styles.noAccess}>
            Нет доступных действий для вашей роли.
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logout} onPress={() => void signOut()} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <AppText variant="button" color={colors.danger} style={styles.logoutText}>
            Выйти
          </AppText>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function SectionLabel({ title }: { title: string }): React.ReactElement {
  return (
    <AppText variant="caption" muted style={styles.section}>
      {title.toUpperCase()}
    </AppText>
  );
}

function PrimaryShopCard({ shopId }: { shopId: string }): React.ReactElement | null {
  const { data: shop } = useShop(shopId);

  if (!shop) {
    return null;
  }

  return (
    <Card style={styles.shopCard}>
      <View style={styles.shopIcon}>
        <Ionicons name="storefront-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.shopInfo}>
        <AppText variant="caption" muted>
          Основной магазин
        </AppText>
        <AppText variant="label">{shop.name}</AppText>
        {shop.address ? (
          <AppText variant="caption" muted style={styles.shopAddress}>
            {shop.address}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  profile: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  profileText: {
    flex: 1,
  },
  shopCard: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  shopIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  shopInfo: {
    flex: 1,
  },
  shopAddress: {
    marginTop: spacing.xs,
  },
  chipText: {
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  section: {
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  noAccess: {
    marginTop: spacing.lg,
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  logout: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: colors.danger,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  logoutText: {
    marginLeft: spacing.sm,
  },
});
