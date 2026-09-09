import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { PlannedScheduleList } from '@/features/patrol/PlannedScheduleList';
import { useAvailableSchedules, useStartPatrol } from '@/features/patrol/queries';
import { formatScheduleTime } from '@/features/schedules/format';
import { appIcons, colors, spacing } from '@/theme';
import { AppText, AppToast, Button, Card, EntityIcon, StatusLabel } from '@/ui';

type PatrolStartPanelProps = {
  onOpenPlan?: () => void;
  onSelectShop?: () => void;
  onStarted?: () => void;
  shopId: string | null;
};

export function PatrolStartPanel({
  onOpenPlan,
  onSelectShop,
  onStarted,
  shopId,
}: PatrolStartPanelProps): React.ReactElement {
  const schedules = useAvailableSchedules(shopId);
  const start = useStartPatrol(shopId);
  const error = schedules.isError
    ? describeError(schedules.error)
    : start.isError
      ? describeError(start.error)
      : null;

  if (!shopId) {
    return (
      <Card style={styles.card}>
        <View style={styles.header}>
          <EntityIcon icon="storefront-outline" tone="neutral" />
          <View style={styles.headerCopy}>
            <AppText variant="label">Магазин не выбран</AppText>
            <AppText variant="caption" muted style={styles.headerSubtitle}>
              Выберите магазин, чтобы увидеть доступные обходы.
            </AppText>
          </View>
        </View>
        {onSelectShop ? (
          <View style={styles.primaryAction}>
            <Button
              label="Выбрать магазин"
              icon="storefront-outline"
              onPress={onSelectShop}
            />
          </View>
        ) : null}
      </Card>
    );
  }

  if (schedules.isPending) {
    return (
      <Card style={styles.card}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption" muted style={styles.loadingText}>
            Проверяем доступные обходы...
          </AppText>
        </View>
      </Card>
    );
  }

  const scheduleItems = schedules.data ?? [];
  const current = scheduleItems.find((schedule) => schedule.isAvailable);
  const planned = scheduleItems.filter((schedule) => !schedule.isAvailable);

  return (
    <Card style={styles.card}>
      <AppToast message={error} />
      <View style={styles.header}>
        <EntityIcon icon={current ? appIcons.patrol : 'calendar-outline'} />
        <View style={styles.headerCopy}>
          <AppText variant="label">
            {current?.name ?? 'Обход пока недоступен'}
          </AppText>
          <AppText variant="caption" muted style={styles.headerSubtitle}>
            {current ? 'Можно приступить к маршруту' : 'Начало доступно по расписанию'}
          </AppText>
        </View>
        <StatusLabel
          label={current ? 'Доступен' : 'По плану'}
          tone={current ? 'success' : 'neutral'}
        />
      </View>

      {current ? (
        <View style={styles.windowRow}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <View style={styles.windowCopy}>
            <AppText variant="caption" muted>
              Доступное окно
            </AppText>
            <AppText variant="body" style={styles.windowValue}>
              {formatScheduleTime(current.startTime)} - {formatScheduleTime(current.endTime)}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.plannedBlock}>
          <AppText variant="caption" muted>
            Ближайшие плановые обходы
          </AppText>
          <PlannedScheduleList schedules={planned.length > 0 ? planned : scheduleItems} />
          {scheduleItems.length === 0 ? (
            <AppText variant="caption" muted style={styles.emptyText}>
              Для выбранного магазина пока нет запланированных обходов.
            </AppText>
          ) : null}
        </View>
      )}

      {schedules.isError ? (
        <AppText variant="caption" color={colors.danger} style={styles.errorText}>
          {describeError(schedules.error)}
        </AppText>
      ) : null}

      <View style={styles.primaryAction}>
        <Button
          label="Начать обход"
          icon={appIcons.patrol}
          disabled={!current}
          loading={start.isPending}
          onPress={() => {
            if (current) {
              start.mutate(current.id, { onSuccess: onStarted });
            }
          }}
        />
      </View>
      <View style={styles.secondaryAction}>
        <Button
          label="Обновить обходы"
          icon="refresh-outline"
          variant="secondary"
          onPress={() => void schedules.refetch()}
          loading={schedules.isFetching}
        />
      </View>
      {onOpenPlan ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={onOpenPlan}
          style={styles.planAction}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <AppText variant="caption" color={colors.primary} style={styles.planActionText}>
            Посмотреть график на 7 дней
          </AppText>
          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg },
  loading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 80,
  },
  loadingText: { marginLeft: spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row' },
  headerCopy: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  headerSubtitle: { marginTop: spacing.xs },
  windowRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  windowCopy: { marginLeft: spacing.sm },
  windowValue: { marginTop: 2 },
  plannedBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyText: { marginTop: spacing.sm },
  errorText: { marginTop: spacing.md },
  primaryAction: { marginTop: spacing.lg },
  secondaryAction: { marginTop: spacing.sm },
  planAction: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    paddingTop: spacing.sm,
  },
  planActionText: { marginHorizontal: spacing.sm },
});
