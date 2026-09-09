import { describe, expect, it } from '@jest/globals';
import type { MobileSchedulePlanItemDto } from '@patrol/shared';

import { buildScheduleReminders } from './schedule-reminders';

function scheduleItem(
  overrides: Partial<MobileSchedulePlanItemDto> = {},
): MobileSchedulePlanItemDto {
  return {
    availableFrom: new Date('2026-09-10T08:30:00.000Z'),
    dueAt: new Date('2026-09-10T10:00:00.000Z'),
    notificationAt: new Date('2026-09-10T08:30:00.000Z'),
    period: 'morning',
    plannedStartAt: new Date('2026-09-10T09:00:00.000Z'),
    scheduleId: 'schedule-1',
    scheduleName: 'Утренний обход',
    shopId: 'shop-1',
    shopName: 'Магазин 1',
    timezone: 'Europe/Moscow',
    weekday: 4,
    ...overrides,
  };
}

describe('buildScheduleReminders', () => {
  it('plans an early alert, the planned start and three repeats', () => {
    const reminders = buildScheduleReminders(
      scheduleItem(),
      Date.parse('2026-09-10T08:00:00.000Z'),
    );

    expect(reminders.map((reminder) => reminder.kind)).toEqual([
      'available',
      'planned',
      'repeat',
      'repeat',
      'repeat',
    ]);
    expect(reminders.map((reminder) => reminder.notificationAt)).toEqual([
      '2026-09-10T08:30:00.000Z',
      '2026-09-10T09:00:00.000Z',
      '2026-09-10T09:10:00.000Z',
      '2026-09-10T09:20:00.000Z',
      '2026-09-10T09:30:00.000Z',
    ]);
  });

  it('does not duplicate the alert when availability starts at the planned time', () => {
    const plannedStartAt = new Date('2026-09-10T09:00:00.000Z');
    const reminders = buildScheduleReminders(
      scheduleItem({ availableFrom: plannedStartAt, notificationAt: plannedStartAt }),
      Date.parse('2026-09-10T08:00:00.000Z'),
    );

    expect(reminders).toHaveLength(4);
    expect(reminders[0]?.kind).toBe('planned');
  });

  it('keeps only future reminders inside the schedule window', () => {
    const reminders = buildScheduleReminders(
      scheduleItem({ dueAt: new Date('2026-09-10T09:25:00.000Z') }),
      Date.parse('2026-09-10T09:15:00.000Z'),
    );

    expect(reminders.map((reminder) => reminder.notificationAt)).toEqual([
      '2026-09-10T09:20:00.000Z',
    ]);
  });
});
