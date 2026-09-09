import type { NfcWaitStateDto, PatrolScanAction } from '@patrol/shared';

import type { MobileRoutePoint } from '@/api/patrols.api';
import { DEFAULT_PATROL_POINT_DWELL_SECONDS } from '@/features/patrol-routes/route-point-settings';

import type { LocalEventView } from './use-local-events';

export function projectLocalNfcEvents(
  serverState: NfcWaitStateDto,
  points: MobileRoutePoint[],
  localEvents: LocalEventView[],
): NfcWaitStateDto {
  const sortedPoints = [...points].sort((left, right) => left.sortOrder - right.sortOrder);
  const pointById = new Map(sortedPoints.map((point) => [point.id, point]));
  const orderedEvents = [...localEvents].sort((left, right) =>
    left.scannedAt.localeCompare(right.scannedAt),
  );
  let projected = { ...serverState };

  for (const event of orderedEvents) {
    if (projected.mode === 'completed') {
      break;
    }

    const eventPoint = pointById.get(event.patrolPointId);
    const expectedPoint = projected.expectedPoint;
    const expectedAction = projected.expectedScanAction;
    if (!eventPoint || !expectedPoint || !expectedAction) {
      break;
    }

    if (eventPoint.sortOrder < expectedPoint.sortOrder) {
      continue;
    }
    if (eventPoint.id !== expectedPoint.id) {
      break;
    }
    if (expectedAction === 'depart' && event.scanAction === 'arrive') {
      continue;
    }
    if (event.scanAction !== expectedAction) {
      break;
    }
    if (
      event.scanAction === 'depart' &&
      projected.lockedUntil !== undefined &&
      new Date(event.scannedAt).getTime() < new Date(String(projected.lockedUntil)).getTime()
    ) {
      break;
    }

    projected =
      event.scanAction === 'arrive'
        ? projectArrival(projected, event)
        : projectDeparture(projected, sortedPoints, eventPoint);
  }

  return projected;
}

function projectArrival(
  state: NfcWaitStateDto,
  event: LocalEventView,
): NfcWaitStateDto {
  const scannedAt = new Date(event.scannedAt).getTime();
  const lockedUntil = new Date(scannedAt + Math.max(0, state.pointDwellSeconds) * 1000);

  return {
    ...state,
    canAcceptNfc: true,
    expectedScanAction: 'depart' satisfies PatrolScanAction,
    lockedUntil,
    mode: 'waiting_for_departure',
    pointVisitStatus: 'arrived',
    remainingLockSeconds: undefined,
  };
}

function projectDeparture(
  state: NfcWaitStateDto,
  sortedPoints: MobileRoutePoint[],
  completedPoint: MobileRoutePoint,
): NfcWaitStateDto {
  const nextPoint = sortedPoints.find((point) => point.sortOrder > completedPoint.sortOrder);
  const scannedPoints = Math.min(state.totalPoints, state.scannedPoints + 1);

  if (!nextPoint || scannedPoints >= state.totalPoints) {
    return {
      ...state,
      canAcceptNfc: false,
      expectedPoint: undefined,
      expectedScanAction: undefined,
      lockedUntil: undefined,
      mode: 'completed',
      pointVisitStatus: 'completed',
      remainingLockSeconds: undefined,
      scannedPoints,
    };
  }

  return {
    ...state,
    canAcceptNfc: true,
    expectedPoint: {
      description: nextPoint.description,
      id: nextPoint.id,
      name: nextPoint.name,
      nfcTagId: nextPoint.nfcTagId,
      photoFileId: nextPoint.photoFileId,
      sortOrder: nextPoint.sortOrder,
    },
    expectedScanAction: 'arrive' satisfies PatrolScanAction,
    lockedUntil: undefined,
    mode: 'waiting_for_nfc',
    pointDwellSeconds: nextPoint.dwellSeconds ?? DEFAULT_PATROL_POINT_DWELL_SECONDS,
    pointVisitStatus: 'pending',
    remainingLockSeconds: undefined,
    scannedPoints,
  };
}
