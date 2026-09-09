import { buildPointSettings, normalizeDwellSeconds } from './route-point-settings';

describe('route point dwell settings', () => {
  it('clamps and rounds dwell seconds to the backend contract', () => {
    expect(normalizeDwellSeconds(-1)).toBe(0);
    expect(normalizeDwellSeconds(30.6)).toBe(31);
    expect(normalizeDwellSeconds(121)).toBe(120);
    expect(normalizeDwellSeconds(Number.NaN)).toBe(90);
  });

  it('keeps route order and supplies the default for a missing value', () => {
    expect(buildPointSettings(['second', 'first'], { first: 45 })).toEqual([
      { patrolPointId: 'second', dwellSeconds: 90 },
      { patrolPointId: 'first', dwellSeconds: 45 },
    ]);
  });
});
