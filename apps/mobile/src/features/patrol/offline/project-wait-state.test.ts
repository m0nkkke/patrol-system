import { describe, expect, it } from '@jest/globals';
import type { NfcWaitStateDto } from '@patrol/shared';

import type { MobileRoutePoint } from '@/api/patrols.api';

import type { LocalEventView } from './use-local-events';
import { projectLocalNfcEvents } from './project-wait-state';

const points: MobileRoutePoint[] = [point('point-1', 1), point('point-2', 2, 30)];

function point(id: string, sortOrder: number, dwellSeconds = 90): MobileRoutePoint {
  return {
    id,
    isActive: true,
    name: id,
    nfcTagId: `tag-${id}`,
    shopId: 'shop-1',
    sortOrder,
    dwellSeconds,
  };
}

function waitState(expectedPoint = points[0]): NfcWaitStateDto {
  return {
    canAcceptNfc: true,
    expectedPoint,
    expectedScanAction: 'arrive',
    mode: 'waiting_for_nfc',
    patrolId: 'patrol-1',
    pointDwellSeconds: 75,
    pointVisitStatus: 'pending',
    requiresForegroundNfcListening: true,
    scanContract: {
      endpoint: '/api/v1/mobile/patrols/{patrolId}/point-visits/scan',
      method: 'POST',
      requiredFields: [],
    },
    scannedPoints: expectedPoint?.sortOrder === 2 ? 1 : 0,
    shopId: 'shop-1',
    status: 'in_progress',
    totalPoints: 2,
  };
}

function event(
  localId: string,
  patrolPointId: string,
  scanAction: 'arrive' | 'depart',
  scannedAt: string,
): LocalEventView {
  return { localId, patrolPointId, scanAction, scannedAt, syncStatus: 'pending' };
}

describe('projectLocalNfcEvents', () => {
  it('projects arrival into the departure wait state with a local lock', () => {
    const scannedAt = '2026-09-01T10:00:00.000Z';
    const projected = projectLocalNfcEvents(waitState(), points, [
      event('event-1', 'point-1', 'arrive', scannedAt),
    ]);

    expect(projected.mode).toBe('waiting_for_departure');
    expect(projected.expectedScanAction).toBe('depart');
    expect(projected.scannedPoints).toBe(0);
    expect(projected.lockedUntil?.toISOString()).toBe(
      new Date(Date.parse(scannedAt) + 75 * 1000).toISOString(),
    );
  });

  it('does not accept departure before the mandatory dwell time', () => {
    const projected = projectLocalNfcEvents(waitState(), points, [
      event('event-1', 'point-1', 'arrive', '2026-09-01T10:00:00.000Z'),
      event('event-2', 'point-1', 'depart', '2026-09-01T10:01:00.000Z'),
    ]);

    expect(projected.mode).toBe('waiting_for_departure');
    expect(projected.expectedPoint?.id).toBe('point-1');
    expect(projected.scannedPoints).toBe(0);
  });

  it('advances to the next point after a valid arrive and depart pair', () => {
    const projected = projectLocalNfcEvents(waitState(), points, [
      event('event-1', 'point-1', 'arrive', '2026-09-01T10:00:00.000Z'),
      event('event-2', 'point-1', 'depart', '2026-09-01T10:01:16.000Z'),
    ]);

    expect(projected.mode).toBe('waiting_for_nfc');
    expect(projected.expectedPoint?.id).toBe('point-2');
    expect(projected.expectedScanAction).toBe('arrive');
    expect(projected.scannedPoints).toBe(1);
    expect(projected.pointDwellSeconds).toBe(30);
  });

  it('allows immediate departure when the configured dwell is zero', () => {
    const zeroDwellState = { ...waitState(), pointDwellSeconds: 0 };
    const scannedAt = '2026-09-01T10:00:00.000Z';
    const projected = projectLocalNfcEvents(zeroDwellState, points, [
      event('event-1', 'point-1', 'arrive', scannedAt),
      event('event-2', 'point-1', 'depart', scannedAt),
    ]);

    expect(projected.expectedPoint?.id).toBe('point-2');
    expect(projected.scannedPoints).toBe(1);
  });

  it('skips local events already reflected by the server state', () => {
    const projected = projectLocalNfcEvents(waitState(points[1]), points, [
      event('event-1', 'point-1', 'arrive', '2026-09-01T10:00:00.000Z'),
      event('event-2', 'point-1', 'depart', '2026-09-01T10:01:16.000Z'),
      event('event-3', 'point-2', 'arrive', '2026-09-01T10:02:00.000Z'),
    ]);

    expect(projected.mode).toBe('waiting_for_departure');
    expect(projected.expectedPoint?.id).toBe('point-2');
    expect(projected.scannedPoints).toBe(1);
  });

  it('does not advance when a future point is scanned out of order', () => {
    const projected = projectLocalNfcEvents(waitState(), points, [
      event('event-1', 'point-2', 'arrive', '2026-09-01T10:00:00.000Z'),
    ]);

    expect(projected).toEqual(waitState());
  });

  it('completes the projection after departure from the last point', () => {
    const projected = projectLocalNfcEvents(waitState(points[1]), points, [
      event('event-1', 'point-2', 'arrive', '2026-09-01T10:00:00.000Z'),
      event('event-2', 'point-2', 'depart', '2026-09-01T10:01:16.000Z'),
    ]);

    expect(projected.mode).toBe('completed');
    expect(projected.expectedPoint).toBeUndefined();
    expect(projected.expectedScanAction).toBeUndefined();
    expect(projected.scannedPoints).toBe(2);
  });
});
