import type { AvailablePatrolSchedule } from '@/api/types';

export type ScheduleTiming = {
  availableFrom: string;
  dueAt: string;
  plannedStartAt: string;
};

export function sortPlannedSchedules(
  schedules: AvailablePatrolSchedule[],
): AvailablePatrolSchedule[] {
  return [...schedules].sort(compareByNextStart);
}

export function resolveScheduleTiming(
  schedule: AvailablePatrolSchedule,
): ScheduleTiming | null {
  const effectiveEarlyStartMinutes = Math.min(
    schedule.earlyStartMinutes,
    minutesSinceMidnight(schedule.startTime),
  );
  const plannedStartAt = parseTimestamp(schedule.plannedStartAt);
  const dueAt = parseTimestamp(schedule.dueAt);

  if (plannedStartAt !== null) {
    return {
      availableFrom: new Date(
        plannedStartAt - effectiveEarlyStartMinutes * 60_000,
      ).toISOString(),
      dueAt: new Date(dueAt ?? plannedStartAt + scheduleDurationMs(schedule)).toISOString(),
      plannedStartAt: new Date(plannedStartAt).toISOString(),
    };
  }

  const availableFrom = parseTimestamp(schedule.nextStartAt);
  if (availableFrom === null) {
    return null;
  }

  const nextPlannedStartAt = availableFrom + effectiveEarlyStartMinutes * 60_000;
  return {
    availableFrom: new Date(availableFrom).toISOString(),
    dueAt: new Date(nextPlannedStartAt + scheduleDurationMs(schedule)).toISOString(),
    plannedStartAt: new Date(nextPlannedStartAt).toISOString(),
  };
}

function parseTimestamp(value?: string): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function minutesSinceMidnight(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function scheduleDurationMs(schedule: AvailablePatrolSchedule): number {
  return (minutesSinceMidnight(schedule.endTime) - minutesSinceMidnight(schedule.startTime)) * 60_000;
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
