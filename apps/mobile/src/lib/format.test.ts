import { formatClockDuration, formatClockSeconds, formatDurationMinutes } from './format';

describe('formatDurationMinutes', () => {
  it('rounds seconds to minutes for history cards', () => {
    expect(formatDurationMinutes(4358)).toBe('1 ч 13 мин');
    expect(formatDurationMinutes(89)).toBe('1 мин');
    expect(formatDurationMinutes(0)).toBe('0 мин');
  });

  it('returns a placeholder when duration is unavailable', () => {
    expect(formatDurationMinutes()).toBe('—');
    expect(formatDurationMinutes(null)).toBe('—');
  });
});

describe('formatClockDuration', () => {
  it('formats duration as hours, minutes and seconds', () => {
    expect(
      formatClockDuration('2026-08-31T10:00:00.000Z', '2026-08-31T11:12:38.000Z'),
    ).toBe('01:12:38');
  });

  it('returns a placeholder for missing or invalid dates', () => {
    expect(formatClockDuration()).toBe('—');
    expect(formatClockDuration('invalid', '2026-08-31T11:12:38.000Z')).toBe('—');
  });
});

describe('formatClockSeconds', () => {
  it('formats an exact duration without rounding to minutes', () => {
    expect(formatClockSeconds(4358)).toBe('01:12:38');
    expect(formatClockSeconds(7)).toBe('00:00:07');
  });

  it('returns a placeholder when duration is unavailable', () => {
    expect(formatClockSeconds()).toBe('—');
    expect(formatClockSeconds(null)).toBe('—');
  });
});
