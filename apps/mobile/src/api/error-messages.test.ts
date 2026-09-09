import { describe, expect, it } from '@jest/globals';

import { describeError } from './error-messages';
import { ApiError } from './errors';

describe('describeError', () => {
  it('describes an open patrol schedule window', () => {
    const error = new ApiError('PATROL_SCHEDULE_WINDOW_OPEN', 'backend message', 409);

    expect(describeError(error)).toBe(
      'Нельзя изменить расписание или часовой пояс, пока открыто окно обхода. Повторите после его окончания.',
    );
  });
});
