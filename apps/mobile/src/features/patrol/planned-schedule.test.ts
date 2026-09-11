import { describe, expect, it } from '@jest/globals';
import type { AvailablePatrolSchedule } from '@patrol/shared';

import { resolveScheduleTiming, sortPlannedSchedules } from './planned-schedule';

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
    requiresLateStartReason: false,
    name: id,
    period: 'morning',
    shopId: 'shop-1',
    startTime: '09:00:00',
    timezone: 'Europe/Moscow',
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

describe('resolveScheduleTiming', () => {
  it('separates availability, on-time start and completion for the next patrol', () => {
    expect(
      resolveScheduleTiming(
        schedule('schedule', {
          earlyStartMinutes: 10,
          endTime: '13:45:00',
          nextStartAt: '2026-09-11T06:30:00.000Z',
          startTime: '13:40:00',
        }),
      ),
    ).toEqual({
      availableFrom: '2026-09-11T06:30:00.000Z',
      dueAt: '2026-09-11T06:45:00.000Z',
      plannedStartAt: '2026-09-11T06:40:00.000Z',
    });
  });

  it('uses the server occurrence timestamps for an available patrol', () => {
    expect(
      resolveScheduleTiming(
        schedule('schedule', {
          dueAt: '2026-09-11T06:45:00.000Z',
          earlyStartMinutes: 10,
          isAvailable: true,
          plannedStartAt: '2026-09-11T06:40:00.000Z',
        }),
      ),
    ).toEqual({
      availableFrom: '2026-09-11T06:30:00.000Z',
      dueAt: '2026-09-11T06:45:00.000Z',
      plannedStartAt: '2026-09-11T06:40:00.000Z',
    });
  });
});
