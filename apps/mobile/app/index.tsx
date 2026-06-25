import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { roleLabel } from '@/features/users/role';
import { getInitials } from '@/lib/initials';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
import { AppText, Avatar, MenuItem, Screen } from '@/ui';

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
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profile}>
          <Avatar initials={getInitials(user?.fullName)} />
          <View style={styles.profileText}>
            <AppText variant="caption" muted>
              Добрый день,
            </AppText>
            <AppText variant="heading">{user?.fullName ?? ''}</AppText>
            {role ? (
              <View style={styles.chip}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                <AppText variant="caption" color={colors.primary} style={styles.chipText}>
                  {roleLabel(role)}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        {isAdmin ? (
          <View>
            <SectionLabel title="Создать" />
            <MenuItem
              icon="business-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Регистрация магазина"
              subtitle="Добавить новую торговую точку"
              onPress={() => router.push('/shops/new')}
            />
            <MenuItem
              icon="person-add-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Регистрация пользователя"
              subtitle="Создать сотрудника, выдать ключ"
              onPress={() => router.push('/users/new')}
            />
            <MenuItem
              icon="git-network-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Регистрация маршрута"
              subtitle="Привязка NFC-меток к точкам"
              onPress={() => router.push('/route-setup/shops')}
            />

            <SectionLabel title="Данные" />
            <MenuItem
              icon="storefront-outline"
              iconColor={colors.iconOrange}
              iconBackground={colors.iconOrangeBackground}
              title="Магазины"
              subtitle="Список магазинов и история обходов"
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
          </View>
        ) : null}

        {isManager ? (
          <View>
            <SectionLabel title="Обходы" />
            <MenuItem
              icon="document-text-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="История обходов"
              subtitle="Обходы и нарушения вашего магазина"
              onPress={openHistory}
            />
          </View>
        ) : null}

        {isEmployee ? (
          <View>
            <SectionLabel title="Обход" />
            <MenuItem
              icon="navigate-outline"
              iconColor={colors.iconBlue}
              iconBackground={colors.iconBlueBackground}
              title="Обход"
              subtitle="Прохождение маршрута и сканирование меток"
              onPress={() => router.push('/patrol')}
            />
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
    marginLeft: spacing.lg,
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.chipBackground,
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    fontWeight: '600',
    marginLeft: spacing.xs,
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
