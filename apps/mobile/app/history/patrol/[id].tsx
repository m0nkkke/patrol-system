import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Patrol, PatrolEvent } from '@/api/types';
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

  const pointNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const point of points ?? []) {
      map.set(point.id, point.name);
    }
    return map;
  }, [points]);

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
        <EventsList patrol={patrol} pointNames={pointNames} />
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
  return (
    <Card style={styles.gapLg}>
      <InfoRow label="Начат" value={formatDateTime(patrol.startedAt)} first />
      <InfoRow label="Завершён" value={formatDateTime(patrol.completedAt)} />
      <InfoRow label="Длительность" value={formatDuration(patrol.startedAt, patrol.completedAt)} />
      {patrol.dueAt ? <InfoRow label="Срок до" value={formatDateTime(patrol.dueAt)} /> : null}
      {patrol.notes ? <InfoRow label="Заметки" value={patrol.notes} /> : null}
    </Card>
  );
}

function EventsList({
  patrol,
  pointNames,
}: {
  patrol: Patrol;
  pointNames: Map<string, string>;
}): React.ReactElement {
  const events = useMemo(
    () => [...(patrol.events ?? [])].sort((a, b) => a.scannedAt.localeCompare(b.scannedAt)),
    [patrol.events],
  );

  return (
    <View>
      <AppText variant="label" style={styles.gapLg}>
        Пройденные точки ({events.length})
      </AppText>
      {events.length === 0 ? (
        <AppText muted style={styles.gapSm}>
          Точек не отмечено.
        </AppText>
      ) : (
        events.map((event, index) => (
          <EventCard
            key={event.id}
            order={index + 1}
            name={pointName(pointNames, event.patrolPointId)}
            event={event}
          />
        ))
      )}
    </View>
  );
}

function EventCard({
  order,
  name,
  event,
}: {
  order: number;
  name: string;
  event: PatrolEvent;
}): React.ReactElement {
  const flags = eventFlags(event);
  return (
    <Card style={styles.eventCard}>
      <View style={styles.eventRow}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <View style={styles.eventInfo}>
          <AppText variant="body">
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
        <AppText variant="caption" muted>
          {formatTime(event.scannedAt)}
        </AppText>
      </View>
    </Card>
  );
}

function pointName(pointNames: Map<string, string>, pointId: string): string {
  const name = pointNames.get(pointId);
  return name && name.trim().length > 0 ? name : 'Без названия';
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
