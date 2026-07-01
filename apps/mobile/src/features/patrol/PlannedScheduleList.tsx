import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { AvailablePatrolSchedule } from '@/api/types';
import { formatScheduleTime } from '@/features/schedules/format';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

type PlannedScheduleListProps = {
  schedules: AvailablePatrolSchedule[];
};

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'понедельник',
  2: 'вторник',
  3: 'среда',
  4: 'четверг',
  5: 'пятница',
  6: 'суббота',
  7: 'воскресенье',
};

export function PlannedScheduleList({
  schedules,
}: PlannedScheduleListProps): React.ReactElement | null {
  if (schedules.length === 0) {
    return null;
  }

  const orderedSchedules = [...schedules].sort(compareByNextStart);

  return (
    <View style={styles.container}>
      {orderedSchedules.slice(0, 3).map((schedule) => (
        <View key={schedule.id} style={styles.item}>
          <View style={styles.icon}>
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <AppText variant="caption" style={styles.name}>
              {schedule.name}
            </AppText>
            <AppText variant="caption" muted>
              {formatPlannedWindow(schedule)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

function compareByNextStart(
  left: AvailablePatrolSchedule,
  right: AvailablePatrolSchedule,
): number {
  const leftTime = left.nextStartAt ? new Date(left.nextStartAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.nextStartAt
    ? new Date(right.nextStartAt).getTime()
    : Number.MAX_SAFE_INTEGER;
  const nextStart = leftTime - rightTime;
  if (nextStart !== 0) {
    return nextStart;
  }

  const startTime = left.startTime.localeCompare(right.startTime);
  if (startTime !== 0) {
    return startTime;
  }

  return left.name.localeCompare(right.name);
}

function formatPlannedWindow(schedule: AvailablePatrolSchedule): string {
  const weekday = schedule.nextWeekday ? WEEKDAY_LABELS[schedule.nextWeekday] : undefined;
  const time = `${formatScheduleTime(schedule.startTime)} - ${formatScheduleTime(schedule.endTime)}`;

  return weekday ? `${weekday}, ${time}` : time;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 30,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 30,
  },
  content: {
    flex: 1,
  },
  name: {
    marginBottom: 2,
  },
});
