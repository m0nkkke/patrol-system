import { patrolPeriodFrom } from './patrol-period-filter';

describe('patrolPeriodFrom', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');

  it('does not limit the all-time period', () => {
    expect(patrolPeriodFrom('all', now)).toBeUndefined();
  });

  it.each([
    ['7d', '2026-08-24T12:00:00.000Z'],
    ['30d', '2026-08-01T12:00:00.000Z'],
    ['90d', '2026-06-02T12:00:00.000Z'],
  ] as const)('calculates %s from date', (period, expected) => {
    expect(patrolPeriodFrom(period, now)).toBe(expected);
  });
});
