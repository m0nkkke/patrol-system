import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { PatrolHomeWidget } from '@/features/patrol/PatrolHomeWidget';
import { useShop } from '@/features/route-setup/queries';
import { useAssignedMobileShops } from '@/features/shops/queries';
import { roleLabel } from '@/features/users/role';
import { useAuthStore } from '@/store/auth-store';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  DashboardContextCard,
  DashboardGroup,
  DashboardLogout,
  DashboardMenuPanel,
  DashboardProfile,
  DashboardQuickActions,
  DashboardSection,
  Screen,
  type DashboardAction,
} from '@/ui';

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const selectedShopId = useAuthStore((state) => state.selectedShopId);
  const signOut = useAuthStore((state) => state.signOut);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isInspector = role === 'inspector';
  const isRouteSetter = role === 'route_setter';
  const isLocalRouteSetter = role === 'local_route_setter';
  const isSecurityGuard = role === 'security_guard';
  const hasAccess =
    isAdmin || isInspector || isRouteSetter || isLocalRouteSetter || isSecurityGuard;
  const effectiveShopId = selectedShopId ?? user?.shopId;

  function openHistory(): void {
    if (isAdmin || isInspector) {
      router.push('/control-patrols');
    } else if (effectiveShopId) {
      router.push({ pathname: '/history/[shopId]', params: { shopId: effectiveShopId } });
    } else {
      router.push('/history');
    }
  }

  function openSchedules(): void {
    if (isLocalRouteSetter && effectiveShopId) {
      router.push({ pathname: '/schedules/[shopId]', params: { shopId: effectiveShopId } });
    } else {
      router.push('/schedules/shops');
    }
  }

  function openPatrolRoutes(): void {
    if (isLocalRouteSetter && effectiveShopId) {
      router.push({ pathname: '/patrol-routes/[shopId]', params: { shopId: effectiveShopId } });
    } else {
      router.push('/patrol-routes/shops');
    }
  }

  function openNfcReplace(): void {
    if (isLocalRouteSetter && effectiveShopId) {
      router.push({ pathname: '/nfc-replace/[shopId]', params: { shopId: effectiveShopId } });
    } else {
      router.push('/nfc-replace/shops');
    }
  }

  const adminQuickActions: DashboardAction[] = [
    {
      icon: 'storefront-outline',
      iconBadge: 'add',
      onPress: () => router.push('/shops/new'),
      title: 'Новый магазин',
    },
    {
      icon: 'person-outline',
      iconBadge: 'add',
      onPress: () => router.push('/users/new'),
      title: 'Новый пользователь',
    },
  ];

  const managementActions: DashboardAction[] = [
    {
      icon: 'storefront-outline',
      onPress: () => router.push('/shops'),
      subtitle: 'Список магазинов и редактирование',
      title: 'Магазины',
    },
    {
      icon: 'people-outline',
      onPress: () => router.push('/users'),
      subtitle: 'Список сотрудников и их данные',
      title: 'Пользователи',
    },
  ];

  const setupActions: DashboardAction[] = [
    {
      icon: 'git-network-outline',
      onPress: openPatrolRoutes,
      subtitle: isLocalRouteSetter
        ? 'Маршруты и контрольные точки вашего магазина'
        : 'Состав маршрутов и каталог контрольных точек',
      title: 'Маршруты и точки',
    },
    {
      icon: 'swap-horizontal-outline',
      onPress: openNfcReplace,
      subtitle: isLocalRouteSetter
        ? 'Замена метки в вашем магазине'
        : 'Перепривязать метку у точки',
      title: 'Замена NFC-метки',
    },
    {
      icon: 'calendar-outline',
      onPress: openSchedules,
      subtitle: isLocalRouteSetter
        ? 'График обходов вашего магазина'
        : 'График обходов по магазинам',
      title: 'Расписания',
    },
  ];

  const adminSetupActions: DashboardAction[] = [
    {
      icon: 'swap-horizontal-outline',
      onPress: openNfcReplace,
      subtitle: 'Перепривязать метку у контрольной точки',
      title: 'Замена NFC-метки',
    },
  ];

  const controlActions: DashboardAction[] = [
    {
      icon: 'document-text-outline',
      onPress: openHistory,
      subtitle: isInspector ? 'Обходы назначенных магазинов' : 'По магазинам или сотрудникам',
      title: 'История обходов',
    },
    {
      icon: 'warning-outline',
      iconBackground: colors.dangerSurface,
      iconColor: colors.danger,
      onPress: () => router.push('/incidents'),
      subtitle: isInspector
        ? 'Подозрительные обходы назначенных магазинов'
        : 'Подозрительные обходы по всем магазинам',
      title: 'Нарушения',
    },
    {
      icon: 'documents-outline',
      onPress: () => router.push('/control-reports'),
      subtitle: isInspector
        ? 'Отчёты и фотографии назначенных магазинов'
        : 'Отчёты и фотографии сотрудников контроля',
      title: 'Операционные отчёты',
    },
    {
      icon: 'mail-unread-outline',
      iconBackground: colors.iconOrangeBackground,
      iconColor: colors.iconOrange,
      onPress: () => router.push('/control-appeals'),
      subtitle: isInspector
        ? 'Обращения по назначенным магазинам'
        : 'Обращения сотрудников и изменение статусов',
      title: 'Анонимные обращения',
    },
  ];

  const inspectorActions: DashboardAction[] = [
    {
      icon: 'people-outline',
      onPress: () => router.push('/control-staff'),
      subtitle: 'Ответственные по назначенным магазинам',
      title: 'Сотрудники и назначения',
    },
    {
      icon: 'analytics-outline',
      onPress: () => router.push('/control-shops'),
      subtitle: 'Сводка, ответственные, обходы и нарушения',
      title: 'Контроль магазинов',
    },
    ...controlActions,
  ];

  const guardScheduleActions: DashboardAction[] = [
    {
      icon: 'calendar-outline',
      onPress: () => router.push('/schedule-plan'),
      subtitle: 'Плановые обходы на ближайшие 7 дней',
      title: 'График обходов',
    },
  ];

  const guardReportActions: DashboardAction[] = [
    {
      icon: 'document-text-outline',
      onPress: () => router.push('/reports'),
      subtitle: 'Создать отчёт и прикрепить фотографии',
      title: 'Операционный отчёт',
    },
    {
      icon: 'chatbox-ellipses-outline',
      iconBackground: colors.iconSlateBackground,
      iconColor: colors.iconSlate,
      onPress: () => router.push('/anonymous'),
      subtitle: 'Отправить обращение службе контроля',
      title: 'Анонимно',
    },
  ];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DashboardProfile
          fullName={user?.authorizationFullName ?? user?.fullName ?? 'Пользователь'}
          role={role ? roleLabel(role) : ''}
          onPress={() => router.push('/profile')}
        />

        {isSecurityGuard && effectiveShopId ? (
          <SelectedShopContext shopId={effectiveShopId} />
        ) : isLocalRouteSetter && effectiveShopId ? (
          <PrimaryShopContext shopId={effectiveShopId} />
        ) : isRouteSetter ? (
          <DashboardContextCard
            icon="business-outline"
            label="Область работы"
            name="Все активные магазины"
            address="Магазин выбирается перед каждым действием"
          />
        ) : null}

        {isAdmin ? (
          <>
            <DashboardQuickActions actions={adminQuickActions} />
            <DashboardSection title="Управление" actions={managementActions} />
            <DashboardSection title="Настройка обходов" actions={adminSetupActions} />
            <DashboardSection title="Контроль обходов" actions={controlActions} />
          </>
        ) : null}

        {isRouteSetter || isLocalRouteSetter ? (
          <DashboardSection title="Настройка обходов" actions={setupActions} />
        ) : null}

        {isInspector ? (
          <DashboardSection title="Контроль обходов" actions={inspectorActions} />
        ) : null}

        {isSecurityGuard && effectiveShopId ? (
          <>
            <DashboardGroup title="Обход">
              <PatrolHomeWidget shopId={effectiveShopId} />
              <DashboardMenuPanel actions={guardScheduleActions} />
            </DashboardGroup>
            <DashboardSection title="Отчёты и связь" actions={guardReportActions} />
          </>
        ) : null}

        {!hasAccess ? (
          <AppText muted style={styles.noAccess}>
            Нет доступных действий для вашей роли.
          </AppText>
        ) : null}

        <DashboardLogout onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

function PrimaryShopContext({ shopId }: { shopId: string }): React.ReactElement | null {
  const { data: shop } = useShop(shopId);

  if (!shop) {
    return null;
  }

  return (
    <DashboardContextCard label="Основной магазин" name={shop.name} address={shop.address} />
  );
}

function SelectedShopContext({ shopId }: { shopId: string }): React.ReactElement | null {
  const router = useRouter();
  const { data: shops } = useAssignedMobileShops();
  const shop = shops?.find((item) => item.id === shopId);

  if (!shop) {
    return null;
  }

  return (
    <DashboardContextCard
      label="Выбранный магазин"
      name={shop.name}
      address={shop.address}
      onPress={() => router.push('/select-shop')}
      trailingIcon="swap-horizontal-outline"
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.horizontal,
  },
  noAccess: {
    marginTop: spacing.xl,
  },
});
