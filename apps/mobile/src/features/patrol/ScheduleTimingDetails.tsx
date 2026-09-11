import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { AvailablePatrolSchedule } from '@/api/types';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppText } from '@/ui';

import { resolveScheduleTiming } from './planned-schedule';

export function ScheduleTimingDetails({
  schedule,
}: {
  schedule: AvailablePatrolSchedule;
}): React.ReactElement | null {
  const timing = resolveScheduleTiming(schedule);
  if (!timing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TimingRow
        icon="play-circle-outline"
        label="Можно начать с"
        value={formatDateTime(timing.availableFrom, schedule.timezone)}
      />
      <TimingRow
        icon="alarm-outline"
        label="Начать без опоздания до"
        value={formatDateTime(timing.plannedStartAt, schedule.timezone)}
      />
      <TimingRow
        icon="flag-outline"
        label="Завершить обход до"
        value={formatDateTime(timing.dueAt, schedule.timezone)}
      />
    </View>
  );
}

function TimingRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={styles.copy}>
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="body" style={styles.value}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  copy: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  value: {
    fontWeight: '600',
    marginTop: 2,
  },
});
