import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { PlannedScheduleList } from '@/features/patrol/PlannedScheduleList';
import { requestSync } from '@/features/patrol/offline/sync-manager';
import { usePendingEventCount } from '@/features/patrol/offline/use-pending-events';
import { useActivePatrol, useAvailableSchedules, useStartPatrol } from '@/features/patrol/queries';
import { formatScheduleTime } from '@/features/schedules/format';
import { colors, radius, spacing } from '@/theme';
import { AppText, Button, Card } from '@/ui';

export function PatrolHomeWidget(): React.ReactElement {
  const router = useRouter();
  const active = useActivePatrol();
  const schedules = useAvailableSchedules();
  const start = useStartPatrol();
  const pending = usePendingEventCount();

  const pendingBar = pending > 0 ? <PendingSyncBar count={pending} /> : null;
  const scheduleItems = schedules.data ?? [];
  const current = scheduleItems.find((schedule) => schedule.isAvailable);
  const planned = scheduleItems.filter((schedule) => !schedule.isAvailable);

  let body: React.ReactElement;
  if (active.isPending || schedules.isPending) {
    body = (
      <Card>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Card>
    );
  } else if (active.data) {
    body = (
      <Card>
        <AppText variant="label">Обход идет</AppText>
        <AppText variant="caption" muted style={styles.gapSm}>
          Отмечено {active.data.scannedPoints} из {active.data.totalPoints} точек
        </AppText>
        <View style={styles.gapLg}>
          <Button
            label="Продолжить обход"
            icon="walk-outline"
            onPress={() => router.replace('/patrol')}
          />
        </View>
      </Card>
    );
  } else if (!current) {
    body = (
      <Card>
        <AppText variant="label">Обход пока недоступен</AppText>
        <AppText variant="caption" muted style={styles.gapSm}>
          Ближайшие плановые обходы:
        </AppText>
        <PlannedScheduleList schedules={planned.length > 0 ? planned : scheduleItems} />
        {scheduleItems.length === 0 ? (
          <AppText variant="caption" muted style={styles.gapSm}>
            Плановых обходов пока нет.
          </AppText>
        ) : null}
        {schedules.isError ? (
          <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
            {describeError(schedules.error)}
          </AppText>
        ) : null}
        <View style={styles.gapLg}>
          <Button label="Начать обход" disabled onPress={() => undefined} />
        </View>
        <View style={styles.gapSm}>
          <Button
            label="Обновить"
            icon="refresh-outline"
            variant="secondary"
            onPress={() => void schedules.refetch()}
            loading={schedules.isFetching}
          />
        </View>
      </Card>
    );
  } else {
    body = (
      <Card>
        <AppText variant="label">{current.name}</AppText>
        <View style={styles.windowRow}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" muted style={styles.windowText}>
            Доступно с {formatScheduleTime(current.startTime)} до{' '}
            {formatScheduleTime(current.endTime)}
          </AppText>
        </View>
        {start.isError ? (
          <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
            {describeError(start.error)}
          </AppText>
        ) : null}
        <View style={styles.gapLg}>
          <Button
            label="Начать обход"
            onPress={() =>
              start.mutate(current.id, { onSuccess: () => router.replace('/patrol') })
            }
            loading={start.isPending}
          />
        </View>
        <View style={styles.gapSm}>
          <Button
            label="Обновить"
            icon="refresh-outline"
            variant="secondary"
            onPress={() => void schedules.refetch()}
            loading={schedules.isFetching}
          />
        </View>
      </Card>
    );
  }

  return (
    <View>
      {pendingBar}
      {body}
    </View>
  );
}

function PendingSyncBar({ count }: { count: number }): React.ReactElement {
  return (
    <TouchableOpacity style={styles.pendingBar} onPress={() => requestSync()} activeOpacity={0.7}>
      <Ionicons name="cloud-upload-outline" size={16} color={colors.warning} />
      <AppText variant="caption" color={colors.warning} style={styles.pendingText}>
        Не отправлено сканов: {count} - нажмите для синхронизации
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  windowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  windowText: {
    marginLeft: spacing.xs,
  },
  pendingBar: {
    alignItems: 'center',
    backgroundColor: colors.iconOrangeBackground,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pendingText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});
