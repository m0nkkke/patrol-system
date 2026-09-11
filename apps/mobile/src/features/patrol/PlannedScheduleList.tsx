import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { AvailablePatrolSchedule } from '@/api/types';
import { colors, spacing } from '@/theme';
import { AppText } from '@/ui';

import { sortPlannedSchedules } from './planned-schedule';
import { ScheduleTimingDetails } from './ScheduleTimingDetails';

type PlannedScheduleListProps = {
  schedules: AvailablePatrolSchedule[];
};

export function PlannedScheduleList({
  schedules,
}: PlannedScheduleListProps): React.ReactElement | null {
  if (schedules.length === 0) {
    return null;
  }

  const orderedSchedules = sortPlannedSchedules(schedules);

  return (
    <View style={styles.container}>
      {orderedSchedules.slice(0, 3).map((schedule, index) => (
        <View
          key={schedule.id}
          style={[styles.item, index > 0 ? styles.itemBorder : undefined]}
        >
          <View style={styles.icon}>
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <AppText variant="label" style={styles.name}>
              {schedule.name}
            </AppText>
            <ScheduleTimingDetails schedule={schedule} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  item: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  itemBorder: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  icon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 32,
  },
  content: {
    flex: 1,
  },
  name: {
    marginBottom: spacing.md,
  },
});
