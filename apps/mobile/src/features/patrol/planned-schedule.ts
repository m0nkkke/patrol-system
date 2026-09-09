import type { AvailablePatrolSchedule } from '@/api/types';
import { formatScheduleTime } from '@/features/schedules/format';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'понедельник',
  2: 'вторник',
  3: 'среда',
  4: 'четверг',
  5: 'пятница',
  6: 'суббота',
  7: 'воскресенье',
};

export function sortPlannedSchedules(
  schedules: AvailablePatrolSchedule[],
): AvailablePatrolSchedule[] {
  return [...schedules].sort(compareByNextStart);
}

export function formatPlannedWindow(schedule: AvailablePatrolSchedule): string {
  const weekday = schedule.nextWeekday ? WEEKDAY_LABELS[schedule.nextWeekday] : undefined;
  const time = `${formatScheduleTime(schedule.startTime)} - ${formatScheduleTime(schedule.endTime)}`;

  return weekday ? `${weekday}, ${time}` : time;
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
