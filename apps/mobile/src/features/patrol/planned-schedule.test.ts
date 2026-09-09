import { describe, expect, it } from '@jest/globals';
import type { AvailablePatrolSchedule } from '@patrol/shared';

import { formatPlannedWindow, sortPlannedSchedules } from './planned-schedule';

function schedule(
  id: string,
  overrides: Partial<AvailablePatrolSchedule> = {},
): AvailablePatrolSchedule {
  return {
    earlyStartMinutes: 0,
    endTime: '10:00:00',
    id,
    isActive: true,
    isAvailable: false,
    name: id,
    period: 'morning',
    shopId: 'shop-1',
    startTime: '09:00:00',
    weekdays: [1],
    ...overrides,
  };
}

describe('sortPlannedSchedules', () => {
  it('sorts occurrences from the nearest to the latest and keeps the source intact', () => {
    const source = [
      schedule('later', { nextStartAt: '2026-09-02T09:00:00.000Z' }),
      schedule('without-date'),
      schedule('nearest', { nextStartAt: '2026-09-01T09:00:00.000Z' }),
    ];

    expect(sortPlannedSchedules(source).map((item) => item.id)).toEqual([
      'nearest',
      'later',
      'without-date',
    ]);
    expect(source.map((item) => item.id)).toEqual(['later', 'without-date', 'nearest']);
  });

  it('uses start time and name when the next occurrence is the same', () => {
    const nextStartAt = '2026-09-02T09:00:00.000Z';
    const source = [
      schedule('beta', { name: 'Бета', nextStartAt, startTime: '10:00:00' }),
      schedule('alpha', { name: 'Альфа', nextStartAt, startTime: '10:00:00' }),
      schedule('early', { nextStartAt, startTime: '08:00:00' }),
    ];

    expect(sortPlannedSchedules(source).map((item) => item.id)).toEqual([
      'early',
      'alpha',
      'beta',
    ]);
  });
});

describe('formatPlannedWindow', () => {
  it('shows the next weekday and trims seconds from the interval', () => {
    expect(
      formatPlannedWindow(
        schedule('schedule', {
          endTime: '19:30:00',
          nextWeekday: 3,
          startTime: '18:00:00',
        }),
      ),
    ).toBe('среда, 18:00 - 19:30');
  });
});
