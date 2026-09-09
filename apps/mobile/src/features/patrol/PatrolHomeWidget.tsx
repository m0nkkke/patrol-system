import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { PatrolStartPanel } from '@/features/patrol/PatrolStartPanel';
import { requestSync } from '@/features/patrol/offline/sync-manager';
import { usePendingEventCount } from '@/features/patrol/offline/use-pending-events';
import { useActivePatrol } from '@/features/patrol/queries';
import { formatScheduleTime } from '@/features/schedules/format';
import { appIcons, colors, radius, spacing } from '@/theme';
import { AppText, Button, Card, EntityIcon, ProgressBar, StatusLabel } from '@/ui';

export function PatrolHomeWidget({ shopId }: { shopId: string }): React.ReactElement {
  const router = useRouter();
  const active = useActivePatrol();
  const pending = usePendingEventCount();

  if (active.isPending) {
    return (
      <Card style={styles.activeCard}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Card>
    );
  }

  const body = active.data ? (
    <Card style={styles.activeCard}>
      <View style={styles.activeHeader}>
        <EntityIcon icon={appIcons.patrol} />
        <View style={styles.activeCopy}>
          <AppText variant="label">Обход выполняется</AppText>
          <AppText variant="caption" muted style={styles.gapXs}>
            {active.data.schedule?.name ?? active.data.shop?.name ?? 'Текущий маршрут'}
          </AppText>
        </View>
        <StatusLabel label="Идёт" tone="success" />
      </View>

      <View style={styles.progressHeader}>
        <AppText variant="caption" muted>
          Прогресс маршрута
        </AppText>
        <AppText variant="caption">
          {active.data.scannedPoints} из {active.data.totalPoints}
        </AppText>
      </View>
      <ProgressBar value={active.data.scannedPoints} max={active.data.totalPoints} />

      {active.data.schedule ? (
        <View style={styles.dueRow}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption" muted style={styles.dueText}>
            Завершить до {formatScheduleTime(active.data.schedule.endTime)}
          </AppText>
        </View>
      ) : null}

      <View style={styles.primaryAction}>
        <Button
          label="Продолжить обход"
          icon={appIcons.patrol}
          onPress={() => router.replace('/patrol')}
        />
      </View>
    </Card>
  ) : (
    <PatrolStartPanel shopId={shopId} onStarted={() => router.replace('/patrol')} />
  );

  return (
    <View>
      {pending > 0 ? <PendingSyncBar count={pending} /> : null}
      {body}
    </View>
  );
}

function PendingSyncBar({ count }: { count: number }): React.ReactElement {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.pendingBar}
      onPress={() => requestSync()}
      activeOpacity={0.7}
    >
      <Ionicons name="cloud-upload-outline" size={18} color={colors.warning} />
      <View style={styles.pendingCopy}>
        <AppText variant="caption" color={colors.warning} style={styles.pendingTitle}>
          Ожидает отправки: {count}
        </AppText>
        <AppText variant="caption" muted style={styles.pendingSubtitle}>
          Нажмите, чтобы повторить синхронизацию
        </AppText>
      </View>
      <Ionicons name="refresh" size={18} color={colors.warning} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  activeCard: {
    padding: spacing.lg,
  },
  activeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  activeCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
    minWidth: 0,
  },
  gapXs: {
    marginTop: spacing.xs,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  dueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  dueText: {
    marginLeft: spacing.xs,
  },
  primaryAction: {
    marginTop: spacing.lg,
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
  pendingCopy: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  pendingTitle: {
    fontWeight: '600',
  },
  pendingSubtitle: {
    marginTop: 2,
  },
});
