import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import { useDeleteShop, useShop } from '@/features/route-setup/queries';
import { routeStatusLabel, routeStatusTone } from '@/features/route-setup/route-status';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AppToast,
  AsyncStateScreen,
  Badge,
  Button,
  Card,
  DashboardMenuPanel,
  type DashboardAction,
  DetailRow,
  Header,
  Screen,
} from '@/ui';

export default function ShopDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: shop, isPending, isError, error, refetch } = useShop(id);
  const deleteMutation = useDeleteShop(id);

  if (isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (isError || !shop) {
    return (
      <AsyncStateScreen
        message={describeError(error)}
        onBack={() => router.back()}
        onRetry={() => void refetch()}
      />
    );
  }

  const actions: DashboardAction[] = [
    {
      icon: 'git-network-outline',
      onPress: () =>
        router.push({ pathname: '/patrol-routes/[shopId]', params: { shopId: shop.id } }),
      subtitle: 'Просмотр и управление маршрутами и контрольными точками',
      title: 'Маршруты и точки',
    },
    {
      icon: 'swap-horizontal-outline',
      onPress: () =>
        router.push({ pathname: '/nfc-replace/[shopId]', params: { shopId: shop.id } }),
      subtitle: 'Перепривязать NFC-метку у контрольной точки',
      title: 'Замена NFC-метки',
    },
    {
      icon: 'calendar-outline',
      iconBackground: colors.successBackground,
      iconColor: colors.success,
      onPress: () =>
        router.push({ pathname: '/schedules/[shopId]', params: { shopId: shop.id } }),
      subtitle: 'Просмотр графиков и настроек расписаний',
      title: 'Расписания обходов',
    },
    {
      icon: 'document-text-outline',
      onPress: () =>
        router.push({ pathname: '/history/[shopId]', params: { shopId: shop.id } }),
      subtitle: 'Просмотр истории обходов по магазину',
      title: 'История обходов',
    },
  ];

  const currentShop = shop;

  function copyExternalId(): void {
    if (!currentShop.externalId) {
      return;
    }
    void Clipboard.setStringAsync(currentShop.externalId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openAddress(): void {
    if (!currentShop.address) {
      return;
    }
    const query = encodeURIComponent(currentShop.address);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  function deleteCurrentShop(): void {
    setDeleteDialogOpen(false);
    deleteMutation.mutate(undefined, {
      onSuccess: () => router.dismissTo('/shops'),
    });
  }

  return (
    <Screen padded={false}>
      <AppToast
        message={deleteMutation.isError ? describeError(deleteMutation.error) : null}
      />
      <AppDialog
        visible={deleteDialogOpen}
        title="Удалить магазин?"
        message="Магазин будет удалён из активного списка. Связанные данные и история обходов сохранятся в системе."
        tone="danger"
        actions={[
          { label: 'Удалить', variant: 'danger', onPress: deleteCurrentShop },
          { label: 'Отмена', variant: 'ghost', onPress: () => setDeleteDialogOpen(false) },
        ]}
        onClose={() => setDeleteDialogOpen(false)}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header title="Магазин" onBack={() => router.back()} />

        <Card style={styles.heroCard}>
          <View style={styles.heroMain}>
            <View style={styles.shopIcon}>
              <Ionicons name="storefront-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.heroContent}>
              <AppText variant="heading" numberOfLines={3}>
                {shop.name}
              </AppText>
              <View style={styles.badges}>
                <Badge
                  icon="ellipse"
                  label={shop.isActive ? 'Активен' : 'Неактивен'}
                  tone={shop.isActive ? 'success' : 'danger'}
                />
                <Badge
                  icon="settings-outline"
                  label={routeStatusLabel(shop.routeStatus)}
                  tone={routeStatusTone(shop.routeStatus)}
                />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editAction}
            onPress={() => router.push({ pathname: '/shops/edit/[id]', params: { id: shop.id } })}
            accessibilityRole="button"
            accessibilityLabel="Редактировать магазин"
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <AppText variant="body" color={colors.primary} style={styles.editActionText}>
              Изменить
            </AppText>
          </TouchableOpacity>
        </Card>

        <Card style={styles.detailsCard}>
          <DetailRow
            first
            iconText="ID"
            label="ID магазина"
            value={shop.externalId ?? '—'}
            actionIcon={copied ? 'checkmark' : 'copy-outline'}
            actionLabel="Скопировать ID магазина"
            onAction={shop.externalId ? copyExternalId : undefined}
          />
          <DetailRow
            icon="location-outline"
            label="Адрес"
            value={shop.address ?? '—'}
            actionIcon="navigate-outline"
            actionLabel="Открыть адрес на карте"
            onAction={shop.address ? openAddress : undefined}
          />
          <DetailRow
            icon="time-outline"
            label="Часовой пояс"
            value={shop.timezone}
            trailingIcon="globe-outline"
          />
        </Card>

        <View style={styles.menu}>
          <DashboardMenuPanel actions={actions} />
        </View>
        <View style={styles.deleteAction}>
          <Button
            label="Удалить магазин"
            icon="trash-outline"
            variant="dangerOutline"
            loading={deleteMutation.isPending}
            onPress={() => setDeleteDialogOpen(true)}
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
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  editAction: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    marginTop: spacing.md,
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
  heroCard: {
    padding: spacing.lg,
  },
  heroMain: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  shopIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.md,
    height: 64,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 64,
  },
  heroContent: {
    flex: 1,
    minWidth: 0,
  },
  detailsCard: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
  },
  menu: {
    marginTop: spacing.lg,
  },
  deleteAction: {
    marginTop: spacing.xxl,
  },
});
