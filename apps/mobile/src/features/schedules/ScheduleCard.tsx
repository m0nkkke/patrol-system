import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { PatrolSchedule } from '@/api/types';
import { formatScheduleTime, formatWeekdays } from '@/features/schedules/format';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

type ScheduleCardProps = {
  schedule: PatrolSchedule;
  onPress: () => void;
};

export function ScheduleCard({ schedule, onPress }: ScheduleCardProps): React.ReactElement {
  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.info}>
          <AppText variant="label">{schedule.name}</AppText>
          <AppText variant="caption" muted style={styles.meta}>
            {formatScheduleTime(schedule.startTime)}–{formatScheduleTime(schedule.endTime)} ·{' '}
            {formatWeekdays(schedule.weekdays)}
          </AppText>
          {!schedule.isActive ? (
            <View style={styles.statusRow}>
              <Badge label="Отключено" tone="neutral" />
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  meta: {
    marginTop: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.sm,
  },
});
