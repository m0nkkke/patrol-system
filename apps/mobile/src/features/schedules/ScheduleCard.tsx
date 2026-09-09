import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { PatrolSchedule } from '@/api/types';
import { formatScheduleTime, formatWeekdays } from '@/features/schedules/format';
import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

type ScheduleCardProps = {
  schedule: PatrolSchedule;
  routeName?: string;
  onPress: () => void;
};

function ScheduleCardComponent({
  schedule,
  routeName,
  onPress,
}: ScheduleCardProps): React.ReactElement {
  const inactive = !schedule.isActive;
  const statusColor = schedule.isActive ? colors.success : colors.danger;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.icon, inactive && styles.iconInactive]}>
        <Ionicons
          name="calendar-outline"
          size={22}
          color={inactive ? colors.danger : colors.primary}
        />
      </View>

      <View style={styles.info}>
        <AppText
          variant="label"
          color={inactive ? colors.textMuted : colors.text}
          numberOfLines={2}
        >
          {schedule.name}
        </AppText>
        <AppText variant="caption" muted numberOfLines={2} style={styles.meta}>
          {formatScheduleTime(schedule.startTime)}–{formatScheduleTime(schedule.endTime)} ·{' '}
          {formatWeekdays(schedule.weekdays)}
        </AppText>
        <View style={styles.detailRow}>
          <Ionicons name="git-network-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.detailText}>
            {routeName ?? 'Маршрут не указан'}
          </AppText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="timer-outline" size={15} color={colors.textMuted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.detailText}>
            {schedule.earlyStartMinutes > 0
              ? `Доступно за ${schedule.earlyStartMinutes} мин.`
              : 'Без раннего старта'}
          </AppText>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <AppText variant="caption" color={statusColor} numberOfLines={1} style={styles.statusText}>
            {schedule.isActive ? 'Активно' : 'Отключено'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export const ScheduleCard = memo(ScheduleCardComponent);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 132,
    padding: spacing.md,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  iconInactive: {
    backgroundColor: colors.dangerSurface,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
    minWidth: 0,
  },
  meta: {
    marginTop: spacing.xs,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  detailText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: spacing.xs,
    width: 8,
  },
  statusText: {
    fontWeight: '600',
  },
});
