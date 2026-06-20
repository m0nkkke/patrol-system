import { PatrolIncidentType } from '@patrol/shared';

import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { ShopsService } from '../shops/shops.service';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolsRepository } from './patrols.repository';
import { PatrolsService } from './patrols.service';

type PatrolsRepositoryMock = Pick<
  PatrolsRepository,
  | 'countRouteIntervalsByShop'
  | 'createPatrol'
  | 'createPatrolEvent'
  | 'createPatrolIncident'
  | 'createPatrolRouteInterval'
  | 'findById'
  | 'findByShop'
  | 'findEventsByPatrolOrdered'
  | 'findEventByClientLocalId'
  | 'findEventByPatrolAndPoint'
  | 'findIncidents'
  | 'findPreviousEventByRouteOrder'
  | 'findRouteInterval'
  | 'markCompleted'
  | 'updateScanProgress'
>;

type PatrolPointsServiceMock = Pick<
  PatrolPointsService,
  'countActiveByShop' | 'findActiveTagByUid' | 'findOne' | 'findRegisteredTagByUid'
>;

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;

describe('PatrolsService', () => {
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let patrolsRepository: jest.Mocked<PatrolsRepositoryMock>;
  let service: PatrolsService;
  let shopsService: jest.Mocked<ShopsServiceMock>;

  beforeEach(() => {
    patrolPointsService = {
      countActiveByShop: jest.fn(),
      findActiveTagByUid: jest.fn(),
      findOne: jest.fn(),
      findRegisteredTagByUid: jest.fn(),
    };
    patrolsRepository = {
      countRouteIntervalsByShop: jest.fn(),
      createPatrol: jest.fn(),
      createPatrolEvent: jest.fn(),
      createPatrolIncident: jest.fn(),
      createPatrolRouteInterval: jest.fn(),
      findById: jest.fn(),
      findByShop: jest.fn(),
      findEventsByPatrolOrdered: jest.fn(),
      findEventByClientLocalId: jest.fn(),
      findEventByPatrolAndPoint: jest.fn(),
      findIncidents: jest.fn(),
      findPreviousEventByRouteOrder: jest.fn(),
      findRouteInterval: jest.fn(),
      markCompleted: jest.fn(),
      updateScanProgress: jest.fn(),
    };
    shopsService = {
      findOne: jest.fn(),
    };
    service = new PatrolsService(
      patrolPointsService as unknown as PatrolPointsService,
      patrolsRepository as unknown as PatrolsRepository,
      shopsService as unknown as ShopsService,
    );
    patrolsRepository.findEventByClientLocalId.mockResolvedValue(null);
    patrolsRepository.findEventByPatrolAndPoint.mockResolvedValue(null);
  });

  it('creates long interval incident when scan is slower than route baseline', async () => {
    const patrol = createPatrol();
    const event = createEvent({
      patrolPointId: 'point-2',
      scannedAt: new Date('2026-06-19T10:05:00.000Z'),
    });
    const previousEvent = createEvent({
      patrolPoint: createPatrolPoint({ sortOrder: 1 }),
      patrolPointId: 'point-1',
      scannedAt: new Date('2026-06-19T10:00:00.000Z'),
    });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue({
      id: 'point-2',
      nfcTagId: 'tag-2',
      shopId: patrol.shopId,
      sortOrder: 2,
    } as Awaited<ReturnType<PatrolPointsService['findOne']>>);
    patrolPointsService.findActiveTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: true,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findActiveTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);
    patrolsRepository.findPreviousEventByRouteOrder.mockResolvedValue(previousEvent);
    patrolsRepository.findRouteInterval.mockResolvedValue(
      createRouteInterval({
        baselineSeconds: 60,
        maxSeconds: 120,
        minSeconds: 30,
      }),
    );

    await service.recordEvent(patrol.id, {
      deviceId: 'device-1',
      nfcUid: '04TAG2',
      patrolPointId: 'point-2',
      scannedAt: '2026-06-19T10:05:00.000Z',
    });

    expect(patrolsRepository.createPatrolIncident).toHaveBeenCalledWith({
      actualSeconds: 300,
      expectedSeconds: 60,
      fromPatrolPointId: 'point-1',
      message: 'Слишком длинный интервал: 300 сек. при эталоне 60 сек.',
      patrolEventId: event.id,
      patrolId: patrol.id,
      shopId: patrol.shopId,
      toPatrolPointId: 'point-2',
      type: PatrolIncidentType.LONG_INTERVAL,
    });
  });

  it('returns incidents with filters and pagination', async () => {
    patrolsRepository.findIncidents.mockResolvedValue([[createIncident()], 1]);

    const result = await service.findIncidents({
      employeeId: '11111111-1111-4111-8111-111111111111',
      from: '2026-06-19T00:00:00.000Z',
      limit: 10,
      page: 2,
      shopId: '22222222-2222-4222-8222-222222222222',
      to: '2026-06-19T23:59:59.000Z',
      type: PatrolIncidentType.LONG_INTERVAL,
    });

    expect(patrolsRepository.findIncidents).toHaveBeenCalledWith({
      employeeId: '11111111-1111-4111-8111-111111111111',
      from: new Date('2026-06-19T00:00:00.000Z'),
      limit: 10,
      page: 2,
      shopId: '22222222-2222-4222-8222-222222222222',
      to: new Date('2026-06-19T23:59:59.000Z'),
      type: PatrolIncidentType.LONG_INTERVAL,
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('returns existing event for repeated offline localId', async () => {
    const existingEvent = createEvent({
      clientLocalId: '11111111-1111-4111-8111-111111111111',
      id: 'existing-event-id',
    });
    patrolsRepository.findEventByClientLocalId.mockResolvedValue(existingEvent);

    const result = await service.recordEventWithStatus(
      'patrol-id',
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event: existingEvent, status: 'duplicate' });
    expect(patrolsRepository.createPatrolEvent).not.toHaveBeenCalled();
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('returns existing event for repeated patrol point scan', async () => {
    const existingEvent = createEvent({
      id: 'existing-point-event-id',
      patrolPointId: 'point-2',
    });
    patrolsRepository.findEventByPatrolAndPoint.mockResolvedValue(existingEvent);

    const result = await service.recordEventWithStatus(
      'patrol-id',
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event: existingEvent, status: 'duplicate' });
    expect(patrolsRepository.createPatrolEvent).not.toHaveBeenCalled();
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('stores late offline sync event without changing patrol progress', async () => {
    const patrol = createPatrol({
      scannedPoints: 3,
      status: 'completed',
      totalPoints: 3,
    });
    const event = createEvent({ id: 'late-event-id', lateSync: true });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({
        id: 'point-2',
        nfcTagId: 'tag-2',
        shopId: patrol.shopId,
        sortOrder: 2,
      }),
    );
    patrolPointsService.findRegisteredTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: false,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findRegisteredTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);

    const result = await service.recordEventWithStatus(
      patrol.id,
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event, status: 'late_sync' });
    expect(patrolsRepository.createPatrolEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientLocalId: '11111111-1111-4111-8111-111111111111',
        lateSync: true,
      }),
    );
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('stores offline sync event for deactivated point with conflict status', async () => {
    const patrol = createPatrol();
    const event = createEvent({
      id: 'deactivated-point-event-id',
      pointDeactivatedAfterScan: true,
    });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({
        id: 'point-2',
        isActive: false,
        nfcTagId: 'old-tag-id',
        shopId: patrol.shopId,
        sortOrder: 2,
      }),
    );
    patrolPointsService.findRegisteredTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: false,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findRegisteredTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);

    const result = await service.recordEventWithStatus(
      patrol.id,
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event, status: 'point_deactivated' });
    expect(patrolsRepository.createPatrolEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        pointDeactivatedAfterScan: true,
      }),
    );
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });
});

function createPatrol(overrides: Partial<PatrolEntity> = {}): PatrolEntity {
  return {
    createdAt: new Date(),
    employeeId: 'employee-id',
    id: 'patrol-id',
    scannedPoints: 1,
    shopId: 'shop-id',
    startedAt: new Date('2026-06-19T10:00:00.000Z'),
    status: 'in_progress',
    totalPoints: 3,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolEntity;
}

function createPatrolPoint(overrides: Partial<PatrolPointEntity> = {}): PatrolPointEntity {
  return {
    createdAt: new Date(),
    id: 'point-id',
    isActive: true,
    name: 'Контрольная точка',
    shopId: 'shop-id',
    sortOrder: 1,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolPointEntity;
}

function createEvent(overrides: Partial<PatrolEventEntity> = {}): PatrolEventEntity {
  return {
    createdAt: new Date(),
    deviceId: 'device-1',
    employeeId: 'employee-id',
    id: 'event-id',
    isSuspicious: false,
    nfcTagId: 'tag-id',
    nfcUid: '04tag',
    patrolId: 'patrol-id',
    patrolPointId: 'point-id',
    receivedAt: new Date(),
    scannedAt: new Date(),
    ...overrides,
  } as PatrolEventEntity;
}

function createRouteInterval(
  overrides: Partial<PatrolRouteIntervalEntity> = {},
): PatrolRouteIntervalEntity {
  return {
    baselineSeconds: 60,
    createdAt: new Date(),
    fromPatrolPointId: 'point-1',
    fromSortOrder: 1,
    id: 'interval-id',
    maxSeconds: 120,
    minSeconds: 30,
    shopId: 'shop-id',
    sourcePatrolId: 'source-patrol-id',
    toPatrolPointId: 'point-2',
    toSortOrder: 2,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolRouteIntervalEntity;
}

function createIncident(): PatrolIncidentEntity {
  return {
    createdAt: new Date(),
    id: 'incident-id',
    message: 'Слишком длинный интервал',
    patrolId: 'patrol-id',
    shopId: 'shop-id',
    type: PatrolIncidentType.LONG_INTERVAL,
  } as PatrolIncidentEntity;
}
