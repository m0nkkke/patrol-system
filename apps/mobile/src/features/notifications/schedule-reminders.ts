import type { MobileSchedulePlanItemDto } from '@patrol/shared';

export const PATROL_REMINDER_REPEAT_MINUTES = [10, 20, 30] as const;

export type ScheduleReminder = {
  delayMinutes: number;
  item: MobileSchedulePlanItemDto;
  key: string;
  kind: 'available' | 'planned' | 'repeat';
  notificationAt: string;
};

export function buildScheduleReminders(
  item: MobileSchedulePlanItemDto,
  now = Date.now(),
): ScheduleReminder[] {
  const plannedStartAt = toTimestamp(item.plannedStartAt);
  const notificationAt = toTimestamp(item.notificationAt);
  const dueAt = toTimestamp(item.dueAt);
  const occurrenceKey = `${item.scheduleId}:${toIsoString(item.plannedStartAt)}`;
  const reminders: ScheduleReminder[] = [];

  if (notificationAt < plannedStartAt) {
    reminders.push({
      delayMinutes: 0,
      item,
      key: `${occurrenceKey}:available`,
      kind: 'available',
      notificationAt: new Date(notificationAt).toISOString(),
    });
  }

  reminders.push({
    delayMinutes: 0,
    item,
    key: `${occurrenceKey}:planned`,
    kind: 'planned',
    notificationAt: new Date(plannedStartAt).toISOString(),
  });

  for (const delayMinutes of PATROL_REMINDER_REPEAT_MINUTES) {
    reminders.push({
      delayMinutes,
      item,
      key: `${occurrenceKey}:repeat-${delayMinutes}`,
      kind: 'repeat',
      notificationAt: new Date(plannedStartAt + delayMinutes * 60_000).toISOString(),
    });
  }

  return reminders.filter((reminder) => {
    const reminderAt = Date.parse(reminder.notificationAt);
    return reminderAt > now && reminderAt < dueAt;
  });
}

function toIsoString(value: Date): string {
  return new Date(String(value)).toISOString();
}

function toTimestamp(value: Date): number {
  return new Date(String(value)).getTime();
}
