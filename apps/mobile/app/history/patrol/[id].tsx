import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Patrol, PatrolEvent, RoutePoint } from '@/api/types';
import { usePatrol, usePatrolPoints } from '@/features/history/queries';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { formatDateTime, formatDuration, formatTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Header, InfoRow, ProgressBar, Screen } from '@/ui';

type EventFlag = { label: string; tone: 'neutral' | 'warning' };

export default function PatrolDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: patrol, isPending, isError, error, refetch } = usePatrol(id);
  const { data: points } = usePatrolPoints(patrol?.shopId);

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !patrol) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header title="Обход" onBack={() => router.back()} />

        <SummaryCard patrol={patrol} />
        <DetailsCard patrol={patrol} />
        {patrol.completionReport ? <ReportCard report={patrol.completionReport} /> : null}
        <PointsList patrol={patrol} points={points ?? []} timezone={patrol.shop?.timezone} />
      </ScrollView>
    </Screen>
  );
}

function SummaryCard({ patrol }: { patrol: Patrol }): React.ReactElement {
  const scanned = Math.min(patrol.scannedPoints, patrol.totalPoints);
  return (
    <Card>
      <View style={styles.summaryRow}>
        <View style={styles.summaryText}>
          <AppText variant="heading">{patrol.employee?.fullName ?? 'Сотрудник'}</AppText>
          {patrol.shop?.name ? (
            <AppText variant="caption" muted style={styles.gapXs}>
              {patrol.shop.name}
            </AppText>
          ) : null}
        </View>
        <Badge label={patrolStatusLabel(patrol.status)} tone={patrolStatusTone(patrol.status)} />
      </View>
      <View style={styles.progressWrap}>
        <ProgressBar value={scanned} max={patrol.totalPoints} />
      </View>
      <AppText variant="caption" muted style={styles.gapSm}>
        {scanned} / {patrol.totalPoints} точек пройдено
      </AppText>
    </Card>
  );
}

function DetailsCard({ patrol }: { patrol: Patrol }): React.ReactElement {
  const tz = patrol.shop?.timezone;
  return (
    <Card style={styles.gapLg}>
      <InfoRow label="Начат" value={formatDateTime(patrol.startedAt, tz)} first />
      <InfoRow label="Завершён" value={formatDateTime(patrol.completedAt, tz)} />
      <InfoRow label="Длительность" value={formatDuration(patrol.startedAt, patrol.completedAt)} />
      {patrol.dueAt ? <InfoRow label="Срок до" value={formatDateTime(patrol.dueAt, tz)} /> : null}
      {patrol.cancelledAt ? (
        <InfoRow label="Отменён" value={formatDateTime(patrol.cancelledAt, tz)} />
      ) : null}
      {patrol.cancellationReason ? (
        <InfoRow label="Причина отмены" value={patrol.cancellationReason} />
      ) : null}
      {patrol.notes ? <InfoRow label="Заметки" value={patrol.notes} /> : null}
    </Card>
  );
}

function ReportCard({ report }: { report: string }): React.ReactElement {
  return (
    <Card style={styles.gapLg}>
      <View style={styles.reportTitleRow}>
        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
        <AppText variant="label" style={styles.reportTitle}>
          Отчёт сотрудника
        </AppText>
      </View>
      <AppText variant="body" style={styles.gapSm}>
        {report}
      </AppText>
    </Card>
  );
}

function PointsList({
  patrol,
  points,
  timezone,
}: {
  patrol: Patrol;
  points: RoutePoint[];
  timezone?: string;
}): React.ReactElement {
  const eventByPoint = useMemo(() => {
    const map = new Map<string, PatrolEvent>();
    for (const event of patrol.events ?? []) {
      map.set(event.patrolPointId, event);
    }
    return map;
  }, [patrol.events]);

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.sortOrder - b.sortOrder),
    [points],
  );

  const passedCount = sorted.filter((point) => eventByPoint.has(point.id)).length;

  return (
    <View>
      <AppText variant="label" style={styles.gapLg}>
        Точки маршрута ({passedCount} / {sorted.length})
      </AppText>
      {sorted.length === 0 ? (
        <AppText muted style={styles.gapSm}>
          Нет точек маршрута.
        </AppText>
      ) : (
        sorted.map((point) => (
          <PointCard
            key={point.id}
            order={point.sortOrder}
            name={point.name.trim().length > 0 ? point.name : 'Без названия'}
            event={eventByPoint.get(point.id)}
            timezone={timezone}
          />
        ))
      )}
    </View>
  );
}

function PointCard({
  order,
  name,
  event,
  timezone,
}: {
  order: number;
  name: string;
  event?: PatrolEvent;
  timezone?: string;
}): React.ReactElement {
  const passed = event !== undefined;
  const flags = event ? eventFlags(event) : [];
  return (
    <Card style={styles.eventCard}>
      <View style={styles.eventRow}>
        <Ionicons
          name={passed ? 'checkmark-circle' : 'close-circle'}
          size={22}
          color={passed ? colors.success : colors.danger}
        />
        <View style={styles.eventInfo}>
          <AppText variant="body" color={passed ? colors.text : colors.textMuted}>
            {order}. {name}
          </AppText>
          {flags.length > 0 ? (
            <View style={styles.flags}>
              {flags.map((flag) => (
                <Badge key={flag.label} label={flag.label} tone={flag.tone} />
              ))}
            </View>
          ) : null}
        </View>
        <AppText variant="caption" color={passed ? colors.textMuted : colors.danger}>
          {event ? formatTime(event.scannedAt, timezone) : 'Не пройдена'}
        </AppText>
      </View>
    </Card>
  );
}

function eventFlags(event: PatrolEvent): EventFlag[] {
  const flags: EventFlag[] = [];
  if (event.isSuspicious) {
    flags.push({ label: 'Подозрительно', tone: 'warning' });
  }
  if (event.lateSync) {
    flags.push({ label: 'Поздняя синхронизация', tone: 'neutral' });
  }
  if (event.pointDeactivatedAfterScan) {
    flags.push({ label: 'Точка деактивирована', tone: 'neutral' });
  }
  return flags;
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
  progressWrap: {
    marginTop: spacing.lg,
  },
  gapXs: {
    marginTop: spacing.xs,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  reportTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  reportTitle: {
    marginLeft: spacing.xs,
  },
  eventCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  eventRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  eventInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
